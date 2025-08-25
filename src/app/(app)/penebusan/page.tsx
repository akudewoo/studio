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
import type { Redemption, Product } from '@/lib/types';
import { getRedemptions, addRedemption, updateRedemption, deleteRedemption } from '@/services/redemptionService';
import { getProducts } from '@/services/productService';

const redemptionSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus diisi' }),
  supplier: z.string().min(1, { message: 'Supplier harus diisi' }),
  date: z.string().min(1, { message: 'Tanggal penebusan harus diisi' }),
  productId: z.string().min(1, { message: 'Produk harus dipilih' }),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
});

export default function PenebusanPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRedemption, setEditingRedemption] = useState<Redemption | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        setRedemptions(await getRedemptions());
        setProducts(await getProducts());
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

  const form = useForm<z.infer<typeof redemptionSchema>>({
    resolver: zodResolver(redemptionSchema),
    defaultValues: {
      doNumber: '',
      supplier: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      productId: '',
      quantity: 1,
    },
  });

  const productMap = useMemo(() => {
    return products.reduce((map, product) => {
      map[product.id] = product;
      return map;
    }, {} as Record<string, Product>);
  }, [products]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const handleDialogOpen = (redemption: Redemption | null) => {
    setEditingRedemption(redemption);
    if (redemption) {
      form.reset({
        ...redemption,
        date: format(new Date(redemption.date), 'yyyy-MM-dd'),
      });
    } else {
      form.reset({
        doNumber: '',
        supplier: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        productId: '',
        quantity: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRedemption(id);
      setRedemptions(redemptions.filter((r) => r.id !== id));
      toast({
        title: 'Sukses',
        description: 'Data penebusan berhasil dihapus.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus data penebusan.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof redemptionSchema>) => {
    const redemptionData = { ...values, date: new Date(values.date).toISOString() };
    try {
      if (editingRedemption) {
        await updateRedemption(editingRedemption.id, redemptionData);
        setRedemptions(
          redemptions.map((r) =>
            r.id === editingRedemption.id ? { id: r.id, ...redemptionData } : r
          )
        );
        toast({
          title: 'Sukses',
          description: 'Data penebusan berhasil diperbarui.',
        });
      } else {
        const newRedemption = await addRedemption(redemptionData);
        setRedemptions([ ...redemptions, newRedemption ]);
        toast({
          title: 'Sukses',
          description: 'Penebusan baru berhasil ditambahkan.',
        });
      }
      setIsDialogOpen(false);
      setEditingRedemption(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan data penebusan.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Penebusan</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Penebusan
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NO DO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead className="text-right">QTY</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {redemptions.map((redemption) => {
                const product = productMap[redemption.productId];
                const total = product ? product.purchasePrice * redemption.quantity : 0;
                return (
                  <TableRow key={redemption.id}>
                    <TableCell className="font-medium">{redemption.doNumber}</TableCell>
                    <TableCell>{redemption.supplier}</TableCell>
                    <TableCell>{format(new Date(redemption.date), 'd MMMM yyyy', { locale: id })}</TableCell>
                    <TableCell>{product?.name || 'Produk tidak ditemukan'}</TableCell>
                    <TableCell className="text-right">{redemption.quantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDialogOpen(redemption)}>
                            <Edit className="mr-2 h-4 w-4" /> Ubah
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(redemption.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Hapus
                          </DropdownMenuItem>
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
            <DialogTitle className="font-headline">{editingRedemption ? 'Ubah Penebusan' : 'Tambah Penebusan'}</DialogTitle>
            <DialogDescription>{editingRedemption ? 'Ubah detail penebusan.' : 'Isi detail penebusan baru.'}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField name="doNumber" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>NO DO</FormLabel><FormControl><Input placeholder="cth. DO-2024-001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PT. PETROKIMIA GRESIK">PT. PETROKIMIA GRESIK</SelectItem>
                        <SelectItem value="PT. PUPUK SRIWIJAYA">PT. PUPUK SRIWIJAYA</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField name="date" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Tanggal Penebusan</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="productId" control={form.control} render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Produk</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField name="quantity" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>QTY</FormLabel><FormControl><Input type="number" placeholder="cth. 1000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingRedemption ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
