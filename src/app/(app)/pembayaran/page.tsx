'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Payment, Kiosk, KioskDistribution } from '@/lib/types';
import { getPayments, addPayment, updatePayment, deletePayment } from '@/services/paymentService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getKiosks } from '@/services/kioskService';

const paymentSchema = z.object({
  date: z.string().min(1, { message: 'Tanggal harus diisi' }),
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  kioskId: z.string().min(1, { message: 'Kios harus dipilih' }),
  amount: z.coerce.number().min(1, { message: 'Jumlah bayar harus lebih dari 0' }),
});

export default function PembayaranPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        setPayments(await getPayments());
        setDistributions(await getKioskDistributions());
        setKiosks(await getKiosks());
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
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), doNumber: '', kioskId: '', amount: 0 },
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
    if (payment) form.reset({ ...payment, date: format(new Date(payment.date), 'yyyy-MM-dd') });
    else form.reset({ date: format(new Date(), 'yyyy-MM-dd'), doNumber: '', kioskId: '', amount: 0 });
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
      const paymentData = { ...values, date: new Date(values.date).toISOString() };
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
              <FormField name="date" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="doNumber" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Transaksi (NO DO - Kios)</FormLabel><Select onValueChange={(value) => {
                    const [doNum, kioskId] = value.split('|');
                    form.setValue('doNumber', doNum);
                    form.setValue('kioskId', kioskId);
                }} defaultValue={`${field.value}|${form.getValues('kioskId')}`}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Pilih transaksi" /></SelectTrigger></FormControl>
                  <SelectContent>{uniqueDistributions.map(d => <SelectItem key={`${d.doNumber}-${d.kioskId}`} value={`${d.doNumber}|${d.kioskId}`}>{d.doNumber} - {getKioskName(d.kioskId)}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
              )} />
               <FormField name="kioskId" control={form.control} render={({ field }) => (<FormItem className="hidden"><Input {...field} /></FormItem>)} />
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
