'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import type { KioskDistribution, Kiosk, Product, Redemption, Payment, DORelease } from '@/lib/types';
import { getKioskDistributions, addKioskDistribution, updateKioskDistribution, deleteKioskDistribution } from '@/services/kioskDistributionService';
import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { getPayments } from '@/services/paymentService';
import { getDOReleases } from '@/services/doReleaseService';
import { cn } from '@/lib/utils';

const distributionSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  kioskId: z.string().min(1, { message: 'Kios harus dipilih' }),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
  directPayment: z.coerce.number().min(0, { message: 'Pembayaran harus positif' }),
});

export default function PenyaluranKiosPage() {
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [doReleases, setDoReleases] = useState<DORelease[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDist, setEditingDist] = useState<KioskDistribution | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        setDistributions(await getKioskDistributions());
        setDoReleases(await getDOReleases());
        setRedemptions(await getRedemptions());
        setProducts(await getProducts());
        setKiosks(await getKiosks());
        setPayments(await getPayments());
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

  const form = useForm<z.infer<typeof distributionSchema>>({
    resolver: zodResolver(distributionSchema),
    defaultValues: { doNumber: '', date: new Date(), kioskId: '', quantity: 1, directPayment: 0 },
  });
  
  const getDetails = (doNumber: string) => {
    const redemption = redemptions.find(r => r.doNumber === doNumber);
    const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
    const doRelease = doReleases.find(d => d.doNumber === doNumber);
    return { redemption, product, doRelease };
  }
  
  const getKioskName = (kioskId: string) => kiosks.find(k => k.id === kioskId)?.name || 'N/A';
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const handleDialogOpen = (dist: KioskDistribution | null) => {
    setEditingDist(dist);
    if (dist) form.reset({ ...dist, date: new Date(dist.date) });
    else form.reset({ doNumber: '', date: new Date(), kioskId: '', quantity: 1, directPayment: 0 });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKioskDistribution(id);
      setDistributions(distributions.filter((d) => d.id !== id));
      toast({ title: 'Sukses', description: 'Data penyaluran berhasil dihapus.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus data penyaluran.', variant: 'destructive' });
    }
  };

  const onSubmit = async (values: z.infer<typeof distributionSchema>) => {
    const { doRelease } = getDetails(values.doNumber);
    const distributedQty = distributions.filter(d => d.doNumber === values.doNumber).reduce((sum, d) => sum + d.quantity, 0);

    if (doRelease && (values.quantity + distributedQty > doRelease.quantity)) {
        if(!editingDist || (editingDist && editingDist.doNumber !== values.doNumber)) {
            form.setError("quantity", { type: "manual", message: `QTY melebihi sisa DO (${doRelease.quantity - distributedQty})` });
            return;
        }
    }
    
    const distributionData = { ...values, date: values.date.toISOString() };

    try {
      if (editingDist) {
        await updateKioskDistribution(editingDist.id, distributionData);
        setDistributions(distributions.map((d) => (d.id === editingDist.id ? { id: d.id, ...distributionData } : d)));
        toast({ title: 'Sukses', description: 'Data penyaluran berhasil diperbarui.' });
      } else {
        const newDist = await addKioskDistribution(distributionData);
        setDistributions([...distributions, newDist]);
        toast({ title: 'Sukses', description: 'Penyaluran baru berhasil ditambahkan.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan data penyaluran.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Penyaluran Kios</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => handleDialogOpen(null)}><PlusCircle className="mr-2 h-4 w-4" />Tambah Penyaluran</Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO DO</TableHead><TableHead>Tanggal</TableHead><TableHead>Nama Produk</TableHead>
                <TableHead>Nama Kios</TableHead><TableHead className="text-right">QTY</TableHead><TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Kurang Bayar</TableHead><TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map((dist) => {
                const { product } = getDetails(dist.doNumber);
                const total = product ? dist.quantity * product.sellPrice : 0;
                const totalTempo = payments.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0);
                const kurangBayar = total - dist.directPayment - totalTempo;

                return (
                  <TableRow key={dist.id}>
                    <TableCell className="font-medium">{dist.doNumber}</TableCell>
                    <TableCell>{format(new Date(dist.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{product?.name || 'N/A'}</TableCell>
                    <TableCell>{getKioskName(dist.kioskId)}</TableCell>
                    <TableCell className="text-right">{dist.quantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(kurangBayar)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDialogOpen(dist)}><Edit className="mr-2 h-4 w-4" />Ubah</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(dist.id)}><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="font-headline">{editingDist ? 'Ubah' : 'Tambah'} Penyaluran</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField name="doNumber" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>NO DO</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih NO DO" /></SelectTrigger></FormControl>
                  <SelectContent>{doReleases.map(r => <SelectItem key={r.doNumber} value={r.doNumber}>{r.doNumber} ({getDetails(r.doNumber).product?.name})</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
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
              <FormField name="kioskId" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Nama Kios</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kios" /></SelectTrigger></FormControl>
                  <SelectContent>{kiosks.map(k => <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
              <FormField name="quantity" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>QTY</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="directPayment" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Dibayar Langsung</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingDist ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
