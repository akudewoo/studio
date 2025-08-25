'use client';

import { useState, useMemo } from 'react';
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
import type { KioskDistribution, Kiosk, Product, Redemption, Payment, DORelease } from '@/lib/types';
import { initialKioskDistributions, initialKiosks, initialProducts, initialRedemptions, initialPayments, initialDOReleases } from '@/lib/data';

const distributionSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  date: z.string().min(1, { message: 'Tanggal harus diisi' }),
  kioskId: z.string().min(1, { message: 'Kios harus dipilih' }),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
  directPayment: z.coerce.number().min(0, { message: 'Pembayaran harus positif' }),
});

export default function PenyaluranKiosPage() {
  const [distributions, setDistributions] = useState<KioskDistribution[]>(initialKioskDistributions);
  const [doReleases] = useState<DORelease[]>(initialDOReleases);
  const [redemptions] = useState<Redemption[]>(initialRedemptions);
  const [products] = useState<Product[]>(initialProducts);
  const [kiosks] = useState<Kiosk[]>(initialKiosks);
  const [payments] = useState<Payment[]>(initialPayments);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDist, setEditingDist] = useState<KioskDistribution | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof distributionSchema>>({
    resolver: zodResolver(distributionSchema),
    defaultValues: { doNumber: '', date: format(new Date(), 'yyyy-MM-dd'), kioskId: '', quantity: 1, directPayment: 0 },
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
    if (dist) form.reset({ ...dist, date: format(new Date(dist.date), 'yyyy-MM-dd') });
    else form.reset({ doNumber: '', date: format(new Date(), 'yyyy-MM-dd'), kioskId: '', quantity: 1, directPayment: 0 });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDistributions(distributions.filter((d) => d.id !== id));
    toast({ title: 'Sukses', description: 'Data penyaluran berhasil dihapus.' });
  };

  const onSubmit = (values: z.infer<typeof distributionSchema>) => {
    const { doRelease } = getDetails(values.doNumber);
    const distributedQty = distributions.filter(d => d.doNumber === values.doNumber).reduce((sum, d) => sum + d.quantity, 0);

    if (doRelease && (values.quantity + distributedQty > doRelease.quantity)) {
        if(!editingDist || (editingDist && editingDist.doNumber !== values.doNumber)) {
            form.setError("quantity", { type: "manual", message: `QTY melebihi sisa DO (${doRelease.quantity - distributedQty})` });
            return;
        }
    }

    if (editingDist) {
      setDistributions(distributions.map((d) => (d.id === editingDist.id ? { ...d, ...values, date: new Date(values.date).toISOString() } : d)));
      toast({ title: 'Sukses', description: 'Data penyaluran berhasil diperbarui.' });
    } else {
      setDistributions([...distributions, { id: `dist-${Date.now()}`, ...values, date: new Date(values.date).toISOString() }]);
      toast({ title: 'Sukses', description: 'Penyaluran baru berhasil ditambahkan.' });
    }
    setIsDialogOpen(false);
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
                    <TableCell>{format(new Date(dist.date), 'd MMM yyyy', { locale: id })}</TableCell>
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
              <FormField name="date" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
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
