'use client';

import { useState } from 'react';
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
import type { Kiosk } from '@/lib/types';
import { initialKiosks } from '@/lib/data';

const kioskSchema = z.object({
  name: z.string().min(1, { message: 'Nama kios harus diisi' }),
  address: z.string().min(1, { message: 'Alamat harus diisi' }),
  phone: z.string().min(1, { message: 'No. Telepon harus diisi' }),
});

export default function KiosPage() {
  const [kiosks, setKiosks] = useState<Kiosk[]>(initialKiosks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof kioskSchema>>({
    resolver: zodResolver(kioskSchema),
    defaultValues: {
      name: '',
      address: '',
      phone: '',
    },
  });

  const handleDialogOpen = (kiosk: Kiosk | null) => {
    setEditingKiosk(kiosk);
    if (kiosk) {
      form.reset({
        name: kiosk.name,
        address: kiosk.address,
        phone: kiosk.phone,
      });
    } else {
      form.reset({ name: '', address: '', phone: '' });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setKiosks(kiosks.filter((k) => k.id !== id));
    toast({
      title: 'Sukses',
      description: 'Data kios berhasil dihapus.',
    });
  };

  const onSubmit = (values: z.infer<typeof kioskSchema>) => {
    if (editingKiosk) {
      setKiosks(
        kiosks.map((k) => (k.id === editingKiosk.id ? { ...k, ...values } : k))
      );
      toast({
        title: 'Sukses',
        description: 'Data kios berhasil diperbarui.',
      });
    } else {
      setKiosks([...kiosks, { id: `kiosk-${Date.now()}`, ...values }]);
      toast({
        title: 'Sukses',
        description: 'Kios baru berhasil ditambahkan.',
      });
    }
    setIsDialogOpen(false);
    setEditingKiosk(null);
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Data Kios
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Kios
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kios</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>No. Telepon</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kiosks.map((kiosk) => (
                <TableRow key={kiosk.id}>
                  <TableCell className="font-medium">{kiosk.name}</TableCell>
                  <TableCell>{kiosk.address}</TableCell>
                  <TableCell>{kiosk.phone}</TableCell>
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
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
                name="address"
                render={({ field }) => (
                  <FormItem>
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. Telepon</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. 08123456789" {...field} />
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
                <Button type="submit">{editingKiosk ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
