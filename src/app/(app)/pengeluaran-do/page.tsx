'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

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
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { DORelease, Redemption, Product, DOReleaseInput } from '@/lib/types';
import { getDOReleases, addDORelease, updateDORelease, deleteDORelease, deleteMultipleDOReleases, addMultipleDOReleases } from '@/services/doReleaseService';
import { getRedemptions } from '@/services/redemptionService';
import { getProducts } from '@/services/productService';
import { cn } from '@/lib/utils';

const doReleaseSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
});

// We add redemptionQuantity to the schema for import, but it's not part of the form
const doReleaseImportSchema = doReleaseSchema.extend({
    redemptionQuantity: z.number(),
});

export default function PengeluaranDOPage() {
  const [doReleases, setDoReleases] = useState<DORelease[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<DORelease | null>(null);
  const [selectedReleases, setSelectedReleases] = useState<string[]>([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setDoReleases(await getDOReleases());
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

  const form = useForm<z.infer<typeof doReleaseSchema>>({
    resolver: zodResolver(doReleaseSchema),
    defaultValues: {
      doNumber: '',
      date: new Date(),
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
    if (release) {
      form.reset({
        ...release,
        date: new Date(release.date),
      });
    } else {
      form.reset({
        doNumber: '',
        date: new Date(),
        quantity: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDORelease(id);
      setDoReleases(doReleases.filter((r) => r.id !== id));
      toast({
        title: 'Sukses',
        description: 'Data pengeluaran DO berhasil dihapus.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus data pengeluaran DO.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteMultipleDOReleases(selectedReleases);
      setDoReleases(doReleases.filter(r => !selectedReleases.includes(r.id)));
      setSelectedReleases([]);
      toast({
        title: 'Sukses',
        description: `${selectedReleases.length} pengeluaran DO berhasil dihapus.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus pengeluaran DO terpilih.',
        variant: 'destructive',
      });
    }
  };


  const onSubmit = async (values: z.infer<typeof doReleaseSchema>) => {
    const redemption = redemptionMap[values.doNumber];
    if (!redemption) {
      toast({ title: 'Error', description: 'Data penebusan tidak ditemukan.', variant: 'destructive' });
      return;
    }
    
    const releasedQtyForThisDO = doReleases
        .filter(r => r.doNumber === values.doNumber && r.id !== editingRelease?.id)
        .reduce((sum, r) => sum + r.quantity, 0);

    if (values.quantity + releasedQtyForThisDO > redemption.quantity) {
      form.setError("quantity", { type: "manual", message: `QTY melebihi QTY Penebusan (${redemption.quantity - releasedQtyForThisDO} tersedia)` });
      return;
    }
    
    const releaseData = { ...values, date: values.date.toISOString(), redemptionQuantity: redemption.quantity };

    try {
      if (editingRelease) {
        await updateDORelease(editingRelease.id, releaseData);
        setDoReleases(
          doReleases.map((r) => (r.id === editingRelease.id ? { ...editingRelease, ...releaseData } : r))
        );
        toast({ title: 'Sukses', description: 'Data Pengeluaran DO berhasil diperbarui.' });
      } else {
        const newRelease = await addDORelease(releaseData);
        setDoReleases([...doReleases, newRelease]);
        toast({ title: 'Sukses', description: 'Pengeluaran DO baru berhasil ditambahkan.' });
      }
      setIsDialogOpen(false);
      setEditingRelease(null);
    } catch (error) {
       toast({ title: 'Error', description: 'Gagal menyimpan data pengeluaran DO.', variant: 'destructive' });
    }
  };
  
  const sisaPenebusanByDO = useMemo(() => {
      const sisa: Record<string, number> = {};
      redemptions.forEach(r => {
        const totalReleased = doReleases.filter(d => d.doNumber === r.doNumber).reduce((sum, rel) => sum + rel.quantity, 0);
        sisa[r.doNumber] = r.quantity - totalReleased;
      });
      return sisa;
  }, [doReleases, redemptions]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReleases(doReleases.map(r => r.id));
    } else {
      setSelectedReleases([]);
    }
  };

  const handleSelectRelease = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedReleases([...selectedReleases, id]);
    } else {
      setSelectedReleases(selectedReleases.filter(rid => rid !== id));
    }
  };

  const handleExport = () => {
    const dataToExport = doReleases.map(r => {
        const redemption = redemptionMap[r.doNumber];
        const product = redemption ? productMap[redemption.productId] : null;
        const sisa = sisaPenebusanByDO[r.doNumber] ?? 0;
        return {
            'NO DO': r.doNumber,
            'Tanggal': format(new Date(r.date), 'dd/MM/yyyy'),
            'Nama Produk': product?.name || 'N/A',
            'QTY DO': r.quantity,
            'QTY Penebusan': r.redemptionQuantity,
            'Sisa Penebusan': sisa,
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PengeluaranDO");
    XLSX.writeFile(workbook, "DataPengeluaranDO.xlsx");
     toast({
        title: 'Sukses',
        description: 'Data pengeluaran DO berhasil diekspor.',
      });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            const newReleases: DOReleaseInput[] = [];
            for (const item of json) {
                const excelDate = typeof item['Tanggal'] === 'number' ? new Date(1900, 0, item['Tanggal'] - 1) : new Date(item['Tanggal']);
                const redemption = redemptionMap[item['NO DO']];
                if (!redemption) {
                  console.warn(`Redemption not found for DO: ${item['NO DO']}`);
                  continue;
                }

                const releaseData = {
                    doNumber: item['NO DO'],
                    date: excelDate,
                    quantity: item['QTY DO'],
                    redemptionQuantity: redemption.quantity,
                };
                
                const parsed = doReleaseImportSchema.safeParse(releaseData);
                if (parsed.success) {
                    newReleases.push({
                      ...parsed.data,
                      date: parsed.data.date.toISOString(),
                    });
                } else {
                    console.warn('Invalid item skipped:', parsed.error);
                }
            }

            if (newReleases.length > 0) {
                const addedReleases = await addMultipleDOReleases(newReleases);
                setDoReleases(prev => [...prev, ...addedReleases]);
                toast({
                    title: 'Sukses',
                    description: `${addedReleases.length} pengeluaran DO berhasil diimpor.`,
                });
            } else {
                 toast({
                    title: 'Tidak Ada Data',
                    description: 'Tidak ada data yang valid untuk diimpor.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Gagal mengimpor file. Pastikan format file dan NO DO benar.',
                variant: 'destructive',
            });
        } finally {
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };


  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Pengeluaran DO</h1>
        <div className="ml-auto flex items-center gap-2">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleImport}
            />
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Impor
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Ekspor
            </Button>
          {selectedReleases.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus ({selectedReleases.length})
            </Button>
          ) : (
          <Button size="sm" onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Pengeluaran
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
                    checked={doReleases.length > 0 && selectedReleases.length === doReleases.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
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
                const sisa = sisaPenebusanByDO[release.doNumber] ?? 0;

                return (
                  <TableRow key={release.id} data-state={selectedReleases.includes(release.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReleases.includes(release.id)}
                        onCheckedChange={(checked) => handleSelectRelease(release.id, !!checked)}
                        aria-label={`Pilih ${release.doNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{release.doNumber}</TableCell>
                    <TableCell>{format(new Date(release.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{product?.name || 'N/A'}</TableCell>
                    <TableCell className="text-right">{release.quantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">{release.redemptionQuantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">{sisa.toLocaleString('id-ID')}</TableCell>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!editingRelease}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Pilih NO DO dari penebusan" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {redemptions.map(r => <SelectItem key={r.doNumber} value={r.doNumber}>{r.doNumber} ({productMap[r.productId]?.name})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
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
