'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Download, Search, ArrowUpDown, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { DORelease, Redemption, Product, DOReleaseInput } from '@/lib/types';
import { getDOReleases, addDORelease, updateDORelease, deleteDORelease, deleteMultipleDOReleases, addMultipleDOReleases } from '@/services/doReleaseService';
import { getRedemptions } from '@/services/redemptionService';
import { getProducts } from '@/services/productService';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { exportToPdf } from '@/lib/pdf-export';


const doReleaseSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
});

// We add redemptionQuantity to the schema for import, but it's not part of the form
const doReleaseImportSchema = doReleaseSchema.extend({
    redemptionQuantity: z.number(),
});

type SortConfig = {
  key: keyof DORelease | 'productName' | 'sisaPenebusan';
  direction: 'ascending' | 'descending';
} | null;

export default function PengeluaranDOPage() {
  const [doReleases, setDoReleases] = useState<DORelease[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<DORelease | null>(null);
  const [selectedReleases, setSelectedReleases] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
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
  
  const sisaPenebusanByDO = useMemo(() => {
      const sisa: Record<string, number> = {};
      redemptions.forEach(r => {
        const totalReleased = doReleases.filter(d => d.doNumber === r.doNumber).reduce((sum, rel) => sum + rel.quantity, 0);
        sisa[r.doNumber] = r.quantity - totalReleased;
      });
      return sisa;
  }, [doReleases, redemptions]);

  const sortedAndFilteredDoReleases = useMemo(() => {
    let filterableReleases = [...doReleases];

    if (searchQuery) {
        filterableReleases = filterableReleases.filter(release => {
          const redemption = redemptionMap[release.doNumber];
          const product = redemption ? productMap[redemption.productId] : null;
          return release.doNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (product && product.name.toLowerCase().includes(searchQuery.toLowerCase()));
        });
    }
    
    if (sortConfig !== null) {
      filterableReleases.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;
        
        const redemptionA = redemptionMap[a.doNumber];
        const redemptionB = redemptionMap[b.doNumber];

        if (sortConfig.key === 'productName') {
            const productA = redemptionA ? productMap[redemptionA.productId] : null;
            const productB = redemptionB ? productMap[redemptionB.productId] : null;
            aValue = productA?.name || '';
            bValue = productB?.name || '';
        } else if (sortConfig.key === 'sisaPenebusan') {
            aValue = sisaPenebusanByDO[a.doNumber] ?? 0;
            bValue = sisaPenebusanByDO[b.doNumber] ?? 0;
        } else {
            aValue = a[sortConfig.key as keyof DORelease];
            bValue = b[sortConfig.key as keyof DORelease];
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filterableReleases;
  }, [doReleases, searchQuery, sortConfig, redemptionMap, productMap, sisaPenebusanByDO]);

  const requestSort = (key: keyof DORelease | 'productName' | 'sisaPenebusan') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const summaryData = useMemo(() => {
    return sortedAndFilteredDoReleases.reduce((acc, release) => {
        acc.totalQtyReleased += release.quantity;
        return acc;
    }, { totalQtyReleased: 0 });
  }, [sortedAndFilteredDoReleases]);


  const form = useForm<z.infer<typeof doReleaseSchema>>({
    resolver: zodResolver(doReleaseSchema),
    defaultValues: {
      doNumber: '',
      date: new Date(),
      quantity: 1,
    },
  });

  const doOptions = useMemo(() => {
    return redemptions.map(r => ({
      value: r.doNumber,
      label: `${r.doNumber} (${productMap[r.productId]?.name || 'N/A'})`,
    }));
  }, [redemptions, productMap]);

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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReleases(sortedAndFilteredDoReleases.map(r => r.id));
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

  const handleExportExcel = () => {
    const dataToExport = sortedAndFilteredDoReleases.map(r => {
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
        description: 'Data pengeluaran DO berhasil diekspor ke Excel.',
      });
  };

  const handleExportPdf = () => {
    const headers = [['NO DO', 'Tanggal', 'Nama Produk', 'QTY DO', 'QTY Penebusan', 'Sisa Penebusan']];
    const data = sortedAndFilteredDoReleases.map(r => {
      const redemption = redemptionMap[r.doNumber];
      const product = redemption ? productMap[redemption.productId] : null;
      const sisa = sisaPenebusanByDO[r.doNumber] ?? 0;
      return [
        r.doNumber,
        format(new Date(r.date), 'dd/MM/yyyy'),
        product?.name || 'N/A',
        r.quantity.toLocaleString('id-ID'),
        r.redemptionQuantity.toLocaleString('id-ID'),
        sisa.toLocaleString('id-ID')
      ];
    });
    exportToPdf('Data Pengeluaran DO', headers, data);
    toast({
      title: 'Sukses',
      description: 'Data pengeluaran DO berhasil diekspor ke PDF.',
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
                const doNumber = String(item['NO DO']);
                const redemption = redemptionMap[doNumber];
                if (!redemption) {
                  console.warn(`Redemption not found for DO: ${doNumber}`);
                  continue;
                }

                const releaseData = {
                    doNumber: doNumber,
                    date: excelDate,
                    quantity: item['QTY DO'],
                    redemptionQuantity: redemption.quantity, // Get from existing redemption
                };
                
                const parsed = doReleaseSchema.strip().safeParse(releaseData);
                if (parsed.success) {
                    newReleases.push({
                      ...parsed.data,
                      date: parsed.data.date.toISOString(),
                      redemptionQuantity: redemption.quantity,
                    });
                } else {
                    console.warn('Invalid item skipped:', item, parsed.error);
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
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Pengeluaran DO</h1>
        <div className="ml-auto flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari..."
              className="w-full rounded-lg bg-background md:w-[200px] lg:w-[320px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-2">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Ekspor <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportPdf}>Ekspor ke PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>Ekspor ke Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total QTY Dikeluarkan</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{summaryData.totalQtyReleased.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Jumlah semua kuantitas DO yang dikeluarkan</p>
          </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[40px] px-2">
                   <Checkbox
                    checked={sortedAndFilteredDoReleases.length > 0 && selectedReleases.length === sortedAndFilteredDoReleases.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('doNumber')}>NO DO <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('date')}>Tanggal <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('productName')}>Nama Produk <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-center px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('quantity')}>QTY DO <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-center px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('redemptionQuantity')}>QTY Penebusan <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-center px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('sisaPenebusan')}>Sisa Penebusan <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="w-[40px] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredDoReleases.map((release) => {
                const redemption = redemptionMap[release.doNumber];
                const product = redemption ? productMap[redemption.productId] : null;
                const sisa = sisaPenebusanByDO[release.doNumber] ?? 0;

                return (
                  <TableRow key={release.id} data-state={selectedReleases.includes(release.id) && "selected"}>
                    <TableCell className="px-2">
                      <Checkbox
                        checked={selectedReleases.includes(release.id)}
                        onCheckedChange={(checked) => handleSelectRelease(release.id, !!checked)}
                        aria-label={`Pilih ${release.doNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium px-2">{release.doNumber}</TableCell>
                    <TableCell className="px-2">{format(new Date(release.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="px-2">{product?.name || 'N/A'}</TableCell>
                    <TableCell className="text-center px-2">{release.quantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-center px-2">{release.redemptionQuantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-center px-2">{sisa.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-6 w-6 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
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
          </div>
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
                <FormItem className="flex flex-col">
                  <FormLabel>NO DO</FormLabel>
                   <Combobox
                      options={doOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih NO DO"
                      searchPlaceholder="Cari NO DO..."
                      emptyPlaceholder="NO DO tidak ditemukan."
                      disabled={!!editingRelease}
                    />
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
