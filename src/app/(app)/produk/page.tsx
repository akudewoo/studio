'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import type { Product, Redemption, DORelease } from '@/lib/types';
import { initialProducts, initialRedemptions, initialDOReleases } from '@/lib/data';

const productSchema = z.object({
  name: z.string().min(1, { message: 'Nama produk harus diisi' }),
  purchasePrice: z.coerce.number().min(0, { message: 'Harga beli harus positif' }),
  sellPrice: z.coerce.number().min(0, { message: 'Harga jual harus positif' }),
});

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [redemptions] = useState<Redemption[]>(initialRedemptions);
  const [doReleases] = useState<DORelease[]>(initialDOReleases);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      purchasePrice: 0,
      sellPrice: 0,
    },
  });
  
  const stockByProduct = useMemo(() => {
    const stock: Record<string, number> = {};

    // Calculate total redeemed per DO
    const redeemedQtyByDO: Record<string, number> = {};
    redemptions.forEach(redemption => {
      if (!redeemedQtyByDO[redemption.doNumber]) {
        redeemedQtyByDO[redemption.doNumber] = 0;
      }
      redeemedQtyByDO[redemption.doNumber] += redemption.quantity;
    });
    
    // Calculate total released per DO
    const releasedQtyByDO: Record<string, number> = {};
    doReleases.forEach(release => {
      if (!releasedQtyByDO[release.doNumber]) {
        releasedQtyByDO[release.doNumber] = 0;
      }
      releasedQtyByDO[release.doNumber] += release.quantity;
    });

    // Calculate stock per product
    products.forEach(p => {
        stock[p.id] = 0;
    });

    redemptions.forEach(redemption => {
        const totalRedeemed = redemption.quantity;
        const totalReleased = releasedQtyByDO[redemption.doNumber] || 0;
        const remainingStock = totalRedeemed - totalReleased;
        stock[redemption.productId] = (stock[redemption.productId] || 0) + remainingStock;
    });
    
    return stock;
  }, [products, redemptions, doReleases]);


  const handleDialogOpen = (product: Product | null) => {
    setEditingProduct(product);
    if (product) {
      form.reset({
        name: product.name,
        purchasePrice: product.purchasePrice,
        sellPrice: product.sellPrice,
      });
    } else {
      form.reset({ name: '', purchasePrice: 0, sellPrice: 0 });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
    toast({
      title: 'Sukses',
      description: 'Produk berhasil dihapus.',
    });
  };

  const onSubmit = (values: z.infer<typeof productSchema>) => {
    if (editingProduct) {
      setProducts(
        products.map((p) =>
          p.id === editingProduct.id ? { ...p, ...values } : p
        )
      );
      toast({
        title: 'Sukses',
        description: 'Produk berhasil diperbarui.',
      });
    } else {
      setProducts([
        ...products,
        { id: `prod-${Date.now()}`, ...values },
      ]);
      toast({
        title: 'Sukses',
        description: 'Produk baru berhasil ditambahkan.',
      });
    }
    setIsDialogOpen(false);
    setEditingProduct(null);
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };


  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Daftar Produk
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Produk</TableHead>
                <TableHead className="text-right">Harga Beli</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.purchasePrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.sellPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(stockByProduct[product.id] || 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDialogOpen(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
                        </DropdownMenuItem>
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
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingProduct ? 'Ubah Produk' : 'Tambah Produk'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Ubah detail produk di bawah ini.'
                : 'Isi detail untuk produk baru.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Pupuk Urea" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="cth. 2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Jual</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="cth. 2500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Batal
                  </Button>
                </DialogClose>
                <Button type="submit">{editingProduct ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
