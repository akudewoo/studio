'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

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
import { useToast } from '@/hooks/use-toast';
import type { Kiosk, KioskDistribution, Payment, Product, Redemption } from '@/lib/types';
import { getKiosks, addKiosk, updateKiosk, deleteKiosk, deleteMultipleKiosks } from '@/services/kioskService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getPayments } from '@/services/paymentService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';


const kioskSchema = z.object({
  name: z.string().min(1, { message: 'Nama kios harus diisi' }),
  address: z.string().min(1, { message: 'Alamat harus diisi' }),
  phone: z.string().min(1, { message: 'No. Telepon harus diisi' }),
  desa: z.string().min(1, { message: 'Desa harus diisi' }),
  kecamatan: z.string().min(1, { message: 'Kecamatan harus diisi' }),
  penanggungJawab: z.string().min(1, { message: 'Penanggung Jawab harus diisi' }),
});

export default function KiosPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [selectedKiosks, setSelectedKiosks] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        setKiosks(await getKiosks());
        setDistributions(await getKioskDistributions());
        setPayments(await getPayments());
        setProducts(await getProducts());
        setRedemptions(await getRedemptions());
      } catch (error) {
        console.error("Firebase Error: ", error);
        toast({
          title: 'Gagal Memuat Data',
          description: 'Gagal memuat data dari database.',
          variant: 'destructive',
        });
      }
    }
    loadData();
  }, [toast]);
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const totalBills = useMemo(() => {
    const bills: Record<string, number> = {};

    kiosks.forEach(kiosk => {
      bills[kiosk.id] = 0;
    });

    distributions.forEach(dist => {
      const redemption = redemptions.find(r => r.doNumber === dist.doNumber);
      const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
      if (product) {
        const total = dist.quantity * product.sellPrice;
        const totalTempo = payments.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0);
        const kurangBayar = total - dist.directPayment - totalTempo;
        if (bills[dist.kioskId] !== undefined) {
          bills[dist.kioskId] += kurangBayar;
        }
      }
    });

    return bills;
  }, [kiosks, distributions, payments, products, redemptions]);


  const form = useForm<z.infer<typeof kioskSchema>>({
    resolver: zodResolver(kioskSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
      desa: '',
      kecamatan: '',
      penanggungJawab: '',
    },
  });

  const handleDialogOpen = (kiosk: Kiosk | null) => {
    setEditingKiosk(kiosk);
    if (kiosk) {
      form.reset({
        name: kiosk.name,
        address: kiosk.address,
        phone: kiosk.phone,
        desa: kiosk.desa || '',
        kecamatan: kiosk.kecamatan || '',
        penanggungJawab: kiosk.penanggungJawab || '',
      });
    } else {
      form.reset({ name: '', address: '', phone: '', desa: '', kecamatan: '', penanggungJawab: '' });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKiosk(id);
      setKiosks(kiosks.filter((k) => k.id !== id));
      toast({
        title: 'Sukses',
        description: 'Data kios berhasil dihapus.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus data kios.',
        variant: 'destructive',
      });
    }
  };
  
  const handleDeleteSelected = async () => {
    try {
      await deleteMultipleKiosks(selectedKiosks);
      setKiosks(kiosks.filter(k => !selectedKiosks.includes(k.id)));
      setSelectedKiosks([]);
      toast({
        title: 'Sukses',
        description: `${selectedKiosks.length} kios berhasil dihapus.`,
      });
    } catch (error) {
       toast({
        title: 'Error',
        description: 'Gagal menghapus kios terpilih.',
        variant: 'destructive',
      });
    }
  };


  const onSubmit = async (values: z.infer<typeof kioskSchema>) => {
    try {
      if (editingKiosk) {
        await updateKiosk(editingKiosk.id, values);
        setKiosks(
          kiosks.map((k) => (k.id === editingKiosk.id ? { ...k, ...values } : k))
        );
        toast({
          title: 'Sukses',
          description: 'Data kios berhasil diperbarui.',
        });
      } else {
        const newKiosk = await addKiosk(values);
        setKiosks([...kiosks, newKiosk]);
        toast({
          title: 'Sukses',
          description: 'Kios baru berhasil ditambahkan.',
        });
      }
      setIsDialogOpen(false);
      setEditingKiosk(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan data kios.',
        variant: 'destructive',
      });
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKiosks(kiosks.map(k => k.id));
    } else {
      setSelectedKiosks([]);
    }
  };

  const handleSelectKiosk = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedKiosks([...selectedKiosks, id]);
    } else {
      setSelectedKiosks(selectedKiosks.filter(kid => kid !== id));
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Data Kios
        </h1>
        <div className="ml-auto flex items-center gap-2">
           {selectedKiosks.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus ({selectedKiosks.length})
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Kios
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
                    checked={kiosks.length > 0 && selectedKiosks.length === kiosks.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead>Nama Kios</TableHead>
                <TableHead>Penanggung Jawab</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Desa</TableHead>
                <TableHead>Kecamatan</TableHead>
                <TableHead>No. Telepon</TableHead>
                <TableHead className="text-right">Tagihan Total</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kiosks.map((kiosk) => (
                <TableRow key={kiosk.id} data-state={selectedKiosks.includes(kiosk.id) && "selected"}>
                   <TableCell>
                    <Checkbox
                      checked={selectedKiosks.includes(kiosk.id)}
                      onCheckedChange={(checked) => handleSelectKiosk(kiosk.id, !!checked)}
                      aria-label={`Pilih ${kiosk.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{kiosk.name}</TableCell>
                  <TableCell>{kiosk.penanggungJawab}</TableCell>
                  <TableCell>{kiosk.address}</TableCell>
                  <TableCell>{kiosk.desa}</TableCell>
                  <TableCell>{kiosk.kecamatan}</TableCell>
                  <TableCell>{kiosk.phone}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalBills[kiosk.id] || 0)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDialogOpen(kiosk)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(kiosk.id)}
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
              {editingKiosk ? 'Ubah Kios' : 'Tambah Kios'}
            </DialogTitle>
            <DialogDescription>
              {editingKiosk
                ? 'Ubah detail kios di bawah ini.'
                : 'Isi detail untuk kios baru.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Kios</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Kios Tani Makmur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="penanggungJawab"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Penanggung Jawab</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Budi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Alamat</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Jl. Raya No. 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="desa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desa</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Sukamaju" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="kecamatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kecamatan</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Ciranjang" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>No. Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. 08123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="col-span-2">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Batal
                  </Button>
                </DialogClose>
                <Button type="submit">{editingKiosk ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
