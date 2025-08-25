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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { Redemption, Product } from '@/lib/types';
import { getRedemptions, addRedemption, updateRedemption, deleteRedemption, deleteMultipleRedemptions } from '@/services/redemptionService';
import { getProducts } from '@/services/productService';
import { cn } from '@/lib/utils';

const redemptionSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus diisi' }),
  supplier: z.string().min(1, { message: 'Supplier harus diisi' }),
  date: z.date({ required_error: 'Tanggal penebusan harus diisi' }),
  productId: z.string().min(1, { message: 'Produk harus dipilih' }),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
});

export default function PenebusanPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRedemption, setEditingRedemption] = useState<Redemption | null>(null);
  const [selectedRedemptions, setSelectedRedemptions] = useState<string[]>([]);
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
      date: new Date(),
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
        date: new Date(redemption.date),
      });
    } else {
      form.reset({
        doNumber: '',
        supplier: '',
        date: new Date(),
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

  const handleDeleteSelected = async () => {
    try {
      await deleteMultipleRedemptions(selectedRedemptions);
      setRedemptions(redemptions.filter(r => !selectedRedemptions.includes(r.id)));
      setSelectedRedemptions([]);
       toast({
        title: 'Sukses',
        description: `${selectedRedemptions.length} penebusan berhasil dihapus.`,
      });
    } catch (error) {
       toast({
        title: 'Error',
        description: 'Gagal menghapus penebusan terpilih.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof redemptionSchema>) => {
    const redemptionData = { ...values, date: values.date.toISOString() };
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
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRedemptions(redemptions.map(r => r.id));
    } else {
      setSelectedRedemptions([]);
    }
  };

  const handleSelectRedemption = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRedemptions([...selectedRedemptions, id]);
    } else {
      setSelectedRedemptions(selectedRedemptions.filter(rid => rid !== id));
    }
  };


  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Penebusan</h1>
        <div className="ml-auto flex items-center gap-2">
          {selectedRedemptions.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus ({selectedRedemptions.length})
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Penebusan
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                   <Checkbox
                    checked={redemptions.length > 0 && selectedRedemptions.length === redemptions.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
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
                  <TableRow key={redemption.id} data-state={selectedRedemptions.includes(redemption.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRedemptions.includes(redemption.id)}
                        onCheckedChange={(checked) => handleSelectRedemption(redemption.id, !!checked)}
                        aria-label={`Pilih ${redemption.doNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{redemption.doNumber}</TableCell>
                    <TableCell>{redemption.supplier}</TableCell>
                    <TableCell>{format(new Date(redemption.date), 'dd/MM/yyyy')}</TableCell>
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
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Penebusan</FormLabel>
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
