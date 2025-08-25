'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { Payment, Kiosk, KioskDistribution, Product, Redemption } from '@/lib/types';
import { getPayments, addPayment, updatePayment, deletePayment } from '@/services/paymentService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { cn } from '@/lib/utils';

const paymentSchema = z.object({
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  kioskId: z.string().min(1, { message: 'Kios harus dipilih' }),
  amount: z.coerce.number().min(1, { message: 'Jumlah bayar harus lebih dari 0' }),
});

function OutstandingBalanceDisplay({ control, distributions, redemptions, products, payments, editingPayment }: { control: any, distributions: KioskDistribution[], redemptions: Redemption[], products: Product[], payments: Payment[], editingPayment: Payment | null }) {
    const doNumber = useWatch({ control, name: 'doNumber' });
    const kioskId = useWatch({ control, name: 'kioskId' });
    const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const outstandingBalance = useMemo(() => {
        if (!doNumber || !kioskId) return 0;

        const relevantDistribution = distributions.find(d => d.doNumber === doNumber && d.kioskId === kioskId);
        if (!relevantDistribution) return 0;
        
        const redemption = redemptions.find(r => r.doNumber === doNumber);
        const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
        if (!product) return 0;

        const totalValue = relevantDistribution.quantity * product.sellPrice;
        const totalPaidViaTempo = payments
            .filter(p => p.doNumber === doNumber && p.kioskId === kioskId && p.id !== editingPayment?.id)
            .reduce((sum, p) => sum + p.amount, 0);

        return totalValue - relevantDistribution.directPayment - totalPaidViaTempo;
    }, [doNumber, kioskId, distributions, redemptions, products, payments, editingPayment]);

    if (outstandingBalance <= 0) return null;

    return (
        <FormItem>
            <FormLabel>Sisa Tagihan</FormLabel>
            <FormControl>
                <Input type="text" readOnly value={formatCurrency(outstandingBalance)} className="font-semibold" />
            </FormControl>
        </FormItem>
    );
}

export default function PembayaranPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        setPayments(await getPayments());
        setDistributions(await getKioskDistributions());
        setKiosks(await getKiosks());
        setProducts(await getProducts());
        setRedemptions(await getRedemptions());
      } catch (error) {
        toast({
          title: 'Gagal memuat data',
          description: 'Terjadi kesalahan saat memuat data dari database.',
          variant: 'destructive',
        });
      }
    }
    loadData();
  }, [toast]);

  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { date: new Date(), doNumber: '', kioskId: '', amount: 0 },
  });
  
  const getKioskName = (kioskId: string) => kiosks.find(k => k.id === kioskId)?.name || 'N/A';

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const uniqueDistributions = useMemo(() => {
    const seen = new Set<string>();
    return distributions.filter(d => {
        const key = `${d.doNumber}-${d.kioskId}`;
        if(seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
  }, [distributions]);


  const handleDialogOpen = (payment: Payment | null) => {
    setEditingPayment(payment);
    if (payment) form.reset({ ...payment, date: new Date(payment.date) });
    else form.reset({ date: new Date(), doNumber: '', kioskId: '', amount: 0 });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePayment(id);
      setPayments(payments.filter((p) => p.id !== id));
      toast({ title: 'Sukses', description: 'Data pembayaran berhasil dihapus.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus pembayaran.', variant: 'destructive' });
    }
  };

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    try {
      const paymentData = { ...values, date: values.date.toISOString() };
      if (editingPayment) {
        await updatePayment(editingPayment.id, paymentData);
        setPayments(payments.map((p) => (p.id === editingPayment.id ? { id: p.id, ...paymentData } : p)));
        toast({ title: 'Sukses', description: 'Data pembayaran berhasil diperbarui.' });
      } else {
        const newPayment = await addPayment(paymentData);
        setPayments([...payments, newPayment]);
        toast({ title: 'Sukses', description: 'Pembayaran baru berhasil ditambahkan.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan pembayaran.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Pembayaran</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => handleDialogOpen(null)}><PlusCircle className="mr-2 h-4 w-4" />Tambah Pembayaran</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>NO DO</TableHead>
                <TableHead>Nama Kios</TableHead>
                <TableHead className="text-right">Total Bayar</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="font-medium">{payment.doNumber}</TableCell>
                  <TableCell>{getKioskName(payment.kioskId)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDialogOpen(payment)}><Edit className="mr-2 h-4 w-4" />Ubah</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(payment.id)}><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="font-headline">{editingPayment ? 'Ubah' : 'Tambah'} Pembayaran</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField name="doNumber" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Transaksi (NO DO - Kios)</FormLabel><Select onValueChange={(value) => {
                    const [doNum, kioskId] = value.split('|');
                    form.setValue('doNumber', doNum);
                    form.setValue('kioskId', kioskId);
                }} defaultValue={editingPayment ? `${editingPayment.doNumber}|${editingPayment.kioskId}` : ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih transaksi" /></SelectTrigger></FormControl>
                  <SelectContent>{uniqueDistributions.map(d => <SelectItem key={`${d.doNumber}-${d.kioskId}`} value={`${d.doNumber}|${d.kioskId}`}>{d.doNumber} - {getKioskName(d.kioskId)}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
               <FormField name="kioskId" control={form.control} render={({ field }) => (<FormItem className="hidden"><Input {...field} /></FormItem>)} />
              
              <OutstandingBalanceDisplay 
                control={form.control}
                distributions={distributions}
                redemptions={redemptions}
                products={products}
                payments={payments}
                editingPayment={editingPayment}
              />

              <FormField name="amount" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Total Bayar</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingPayment ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
