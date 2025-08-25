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
import type { DORelease, Redemption, Product } from '@/lib/types';
import { initialDOReleases, initialRedemptions, initialProducts } from '@/lib/data';

const doReleaseSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  date: z.string().min(1, { message: 'Tanggal harus diisi' }),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
});

export default function PengeluaranDOPage() {
  const [doReleases, setDoReleases] = useState<DORelease[]>(initialDOReleases);
  const [redemptions] = useState<Redemption[]>(initialRedemptions);
  const [products] = useState<Product[]>(initialProducts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<DORelease | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof doReleaseSchema>>({
    resolver: zodResolver(doReleaseSchema),
    defaultValues: {
      doNumber: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      quantity: 1,
    },
  });

  const redemptionMap = useMemo(() => {
    return redemptions.reduce((map, r) => {
      map[r.doNumber] = r;
      return map;
    }, {} as Record<string, Redemption>);
  }, [redemptions]);
  
  const productMap = useMemo(() => {
    return products.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {} as Record<string, Product>);
  }, [products]);

  const handleDialogOpen = (release: DORelease | null) => {
    setEditingRelease(release);
    const redemption = release ? redemptionMap[release.doNumber] : null;
    if (release && redemption) {
      form.reset({
        ...release,
        date: format(new Date(release.date), 'yyyy-MM-dd'),
      });
    } else {
      form.reset({
        doNumber: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        quantity: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDoReleases(doReleases.filter((r) => r.id !== id));
    toast({
      title: 'Sukses',
      description: 'Data pengeluaran DO berhasil dihapus.',
    });
  };

  const onSubmit = (values: z.infer<typeof doReleaseSchema>) => {
    const redemption = redemptionMap[values.doNumber];
    if (values.quantity > redemption.quantity) {
      form.setError("quantity", { type: "manual", message: `QTY tidak boleh lebih dari QTY Penebusan (${redemption.quantity})` });
      return;
    }
    
    const newRelease = { ...values, date: new Date(values.date).toISOString(), redemptionQuantity: redemption.quantity };

    if (editingRelease) {
      setDoReleases(
        doReleases.map((r) => (r.id === editingRelease.id ? { ...r, ...newRelease } : r))
      );
      toast({ title: 'Sukses', description: 'Data Pengeluaran DO berhasil diperbarui.' });
    } else {
      setDoReleases([...doReleases, { id: `dor-${Date.now()}`, ...newRelease }]);
      toast({ title: 'Sukses', description: 'Pengeluaran DO baru berhasil ditambahkan.' });
    }
    setIsDialogOpen(false);
    setEditingRelease(null);
  };
  
  const sisaPenebusan = (doNumber: string, redemptionQty: number) => {
      const totalReleased = doReleases.filter(r => r.doNumber === doNumber).reduce((sum, r) => sum + r.quantity, 0);
      return redemptionQty - totalReleased;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Pengeluaran DO</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Pengeluaran
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO DO</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead className="text-right">QTY DO</TableHead>
                <TableHead className="text-right">QTY Penebusan</TableHead>
                <TableHead className="text-right">Sisa Penebusan</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doReleases.map((release) => {
                const redemption = redemptionMap[release.doNumber];
                const product = redemption ? productMap[redemption.productId] : null;
                const remaining = sisaPenebusan(release.doNumber, release.redemptionQuantity) + release.quantity;

                return (
                  <TableRow key={release.id}>
                    <TableCell className="font-medium">{release.doNumber}</TableCell>
                    <TableCell>{format(new Date(release.date), 'd MMMM yyyy', { locale: id })}</TableCell>
                    <TableCell>{product?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">{release.quantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">{release.redemptionQuantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">{(remaining - release.quantity).toLocaleString('id-ID')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDialogOpen(release)}><Edit className="mr-2 h-4 w-4" /> Ubah</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(release.id)}><Trash2 className="mr-2 h-4 w-4" /> Hapus</DropdownMenuItem>
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
          <DialogHeader>
            <DialogTitle className="font-headline">{editingRelease ? 'Ubah' : 'Tambah'} Pengeluaran DO</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField name="doNumber" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>NO DO</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih NO DO dari penebusan" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {redemptions.map(r => <SelectItem key={r.doNumber} value={r.doNumber}>{r.doNumber} ({productMap[r.productId]?.name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="date" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Tanggal</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="quantity" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>QTY</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingRelease ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
