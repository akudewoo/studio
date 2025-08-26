
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Download, Search, ArrowUpDown, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

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
import type { KasUmum, KasUmumInput } from '@/lib/types';
import { getKasUmum, addKasUmum, updateKasUmum, deleteKasUmum, deleteMultipleKasUmum, addMultipleKasUmum } from '@/services/kasUmumService';
import { cn } from '@/lib/utils';
import { exportToPdf } from '@/lib/pdf-export';
import { useBranch } from '@/hooks/use-branch';
import { useAuth } from '@/hooks/use-auth';

const kasUmumSchema = z.object({
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  description: z.string().min(1, { message: 'Uraian harus diisi' }),
  type: z.enum(['debit', 'credit'], { required_error: 'Tipe harus dipilih' }),
  quantity: z.coerce.number().min(0, { message: 'Jumlah tidak boleh negatif' }).default(1),
  unitPrice: z.coerce.number().min(1, { message: 'Harga satuan harus lebih dari 0' }),
  branchId: z.string().min(1, { message: 'Cabang harus dipilih' }),
});

type SortConfig = {
  key: keyof KasUmum | 'branchName';
  direction: 'ascending' | 'descending';
} | null;

export default function KasUmumPage() {
  const { user } = useAuth();
  const { activeBranch, branches, getBranchName, loading: branchLoading } = useBranch();
  const [kasList, setKasList] = useState<KasUmum[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKas, setEditingKas] = useState<KasUmum | null>(null);
  const [selectedKas, setSelectedKas] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!activeBranch) return;
      try {
        const branchIdsToFetch = activeBranch.id === 'all' 
          ? branches.map(b => b.id)
          : [activeBranch.id];
          
        setKasList(await getKasUmum(branchIdsToFetch));
      } catch (error) {
        toast({
          title: 'Gagal memuat data',
          description: 'Terjadi kesalahan saat memuat data kas umum.',
          variant: 'destructive',
        });
      }
    }
    loadData();
  }, [activeBranch, branches, toast]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };
  
  const sortedAndFilteredKasList = useMemo(() => {
    let filterableKas = [...kasList];

    if (searchQuery) {
        filterableKas = filterableKas.filter(kas =>
          kas.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // Sort by date first to ensure balance calculation is correct
    filterableKas.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const withBalance = filterableKas.map(kas => {
        const total = kas.quantity * kas.unitPrice;
        if (kas.type === 'debit') {
            runningBalance += total;
        } else { // credit
            runningBalance -= total;
        }
        return { ...kas, total, balance: runningBalance };
    });

    if (sortConfig !== null) {
      withBalance.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.key === 'branchName') {
            aValue = getBranchName(a.branchId);
            bValue = getBranchName(b.branchId);
        } else {
            aValue = a[sortConfig.key as keyof KasUmum];
            bValue = b[sortConfig.key as keyof KasUmum];
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

    return withBalance;
  }, [kasList, searchQuery, sortConfig, getBranchName]);

  const requestSort = (key: keyof KasUmum | 'branchName') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const summaryData = useMemo(() => {
    return sortedAndFilteredKasList.reduce((acc, kas) => {
        const total = kas.quantity * kas.unitPrice;
        if (kas.type === 'debit') {
            acc.totalDebit += total;
        } else {
            acc.totalCredit += total;
        }
        return acc;
    }, { totalDebit: 0, totalCredit: 0, finalBalance: 0 });
  }, [sortedAndFilteredKasList]);

  const finalBalance = summaryData.totalDebit - summaryData.totalCredit;

  const form = useForm<z.infer<typeof kasUmumSchema>>({
    resolver: zodResolver(kasUmumSchema),
  });

  useEffect(() => {
    if (activeBranch && activeBranch.id !== 'all') {
        form.setValue('branchId', activeBranch.id);
    }
    if (user?.role === 'admin' && user.branchId) {
        form.setValue('branchId', user.branchId);
    }
  }, [activeBranch, user, form, isDialogOpen]);

  const handleDialogOpen = (kas: KasUmum | null) => {
    setEditingKas(kas);
    if (kas) {
      form.reset({
        ...kas,
        date: new Date(kas.date),
      });
    } else {
      form.reset({
        date: new Date(),
        description: '',
        type: 'debit',
        quantity: 1,
        unitPrice: 0,
        branchId: user?.role === 'admin' ? user.branchId : (activeBranch?.id === 'all' ? '' : activeBranch?.id),
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKasUmum(id);
      setKasList(kasList.filter((k) => k.id !== id));
      toast({ title: 'Sukses', description: 'Data kas berhasil dihapus.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus data kas.', variant: 'destructive' });
    }
  };
  
  const handleDeleteSelected = async () => {
    try {
      await deleteMultipleKasUmum(selectedKas);
      setKasList(kasList.filter(k => !selectedKas.includes(k.id)));
      setSelectedKas([]);
      toast({ title: 'Sukses', description: `${selectedKas.length} data kas berhasil dihapus.` });
    } catch (error) {
       toast({ title: 'Error', description: 'Gagal menghapus data kas terpilih.', variant: 'destructive' });
    }
  };

  const onSubmit = async (values: z.infer<typeof kasUmumSchema>) => {
    try {
      const kasData = { ...values, date: values.date.toISOString() };
      if (editingKas) {
        await updateKasUmum(editingKas.id, kasData);
        setKasList(kasList.map((k) => (k.id === editingKas.id ? { id: k.id, total: kasData.quantity * kasData.unitPrice, balance: 0, ...kasData } : k)));
        toast({ title: 'Sukses', description: 'Data kas berhasil diperbarui.' });
      } else {
        const newKas = await addKasUmum(kasData);
        setKasList([...kasList, newKas]);
        toast({ title: 'Sukses', description: 'Data kas baru berhasil ditambahkan.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan data kas.', variant: 'destructive' });
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKas(sortedAndFilteredKasList.map(k => k.id));
    } else {
      setSelectedKas([]);
    }
  };

  const handleSelectKas = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedKas([...selectedKas, id]);
    } else {
      setSelectedKas(selectedKas.filter(kid => kid !== id));
    }
  };
  
  const handleExportExcel = () => {
    const dataToExport = sortedAndFilteredKasList.map(k => ({
        'Tanggal': format(new Date(k.date), 'dd/MM/yyyy'),
        'Kabupaten': user?.role === 'owner' ? getBranchName(k.branchId) : undefined,
        'Uraian': k.description,
        'Debit': k.type === 'debit' ? k.total : 0,
        'Kredit': k.type === 'credit' ? k.total : 0,
        'Saldo': k.balance
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KasUmum");
    XLSX.writeFile(workbook, "DataKasUmum.xlsx");
    toast({ title: 'Sukses', description: 'Data kas umum berhasil diekspor ke Excel.' });
  };

  const handleExportPdf = () => {
    const headers = user?.role === 'owner' 
        ? [['Tanggal', 'Kabupaten', 'Uraian', 'Debit', 'Kredit', 'Saldo']]
        : [['Tanggal', 'Uraian', 'Debit', 'Kredit', 'Saldo']];

    const data = sortedAndFilteredKasList.map(k => {
        const commonData = [
            format(new Date(k.date), 'dd/MM/yyyy'),
            k.description,
            k.type === 'debit' ? formatCurrency(k.total) : '',
            k.type === 'credit' ? formatCurrency(k.total) : '',
            formatCurrency(k.balance)
        ];
        return user?.role === 'owner' ? [commonData[0], getBranchName(k.branchId), ...commonData.slice(1)] : commonData;
    });
    exportToPdf('Data Kas Umum', headers, data);
    toast({ title: 'Sukses', description: 'Data kas umum berhasil diekspor ke PDF.' });
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

            const branchNameToIdMap = branches.reduce((map, b) => {
              map[b.name] = b.id;
              return map;
            }, {} as Record<string, string>);

            const newKasItems: KasUmumInput[] = [];
            for (const item of json) {
                const excelDate = typeof item['Tanggal'] === 'number' ? new Date(1900, 0, item['Tanggal'] - 1) : new Date(item['Tanggal']);
                
                const branchId = activeBranch?.id === 'all'
                    ? branchNameToIdMap[item['Kabupaten']]
                    : activeBranch?.id;

                if (!branchId) {
                  console.warn(`Branch not found for: ${item['Kabupaten']}`);
                  continue;
                }

                const debit = item['Debit'] || 0;
                const credit = item['Kredit'] || 0;
                const total = Math.max(debit, credit);

                const kasData = {
                    date: excelDate,
                    description: item['Uraian'],
                    type: debit > 0 ? 'debit' : 'credit',
                    quantity: 1, // Default quantity to 1 on import
                    unitPrice: total, // Use total as unit price
                    branchId,
                };
                
                const parsed = kasUmumSchema.strip().safeParse(kasData);
                if (parsed.success) {
                    newKasItems.push({
                      ...parsed.data,
                      date: parsed.data.date.toISOString(),
                      total: 0,
                    });
                } else {
                    console.warn('Invalid item skipped:', item, parsed.error);
                }
            }

            if (newKasItems.length > 0) {
                const addedItems = await addMultipleKasUmum(newKasItems);
                setKasList(prev => [...prev, ...addedItems]);
                toast({ title: 'Sukses', description: `${addedItems.length} data kas berhasil diimpor.` });
            } else {
                 toast({ title: 'Tidak Ada Data', description: 'Tidak ada data valid untuk diimpor.', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Gagal mengimpor file. Pastikan format file dan nama cabang benar.', variant: 'destructive' });
        } finally {
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    reader.readAsArrayBuffer(file);
  };

  if (branchLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Kas Umum</h1>
        <div className="ml-auto flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari Uraian..."
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
           {selectedKas.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus ({selectedKas.length})
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Data
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Total Pemasukan (Debit)</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalDebit)}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-600">Total Pengeluaran (Kredit)</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalCredit)}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo Akhir</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(finalBalance)}</div>
              </CardContent>
          </Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                 <TableHead className="w-[40px] px-2">
                   <Checkbox
                    checked={sortedAndFilteredKasList.length > 0 && selectedKas.length === sortedAndFilteredKasList.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('date')}>Tanggal <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                {user?.role === 'owner' && <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('branchName')}>Kabupaten <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>}
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('description')}>Uraian <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right px-2">Debit</TableHead>
                <TableHead className="text-right px-2">Kredit</TableHead>
                <TableHead className="text-right px-2">Saldo</TableHead>
                <TableHead className="w-[40px] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredKasList.map((kas) => {
                return (
                <TableRow key={kas.id} data-state={selectedKas.includes(kas.id) && "selected"}>
                   <TableCell className="px-2">
                    <Checkbox
                      checked={selectedKas.includes(kas.id)}
                      onCheckedChange={(checked) => handleSelectKas(kas.id, !!checked)}
                      aria-label={`Pilih ${kas.description}`}
                    />
                  </TableCell>
                  <TableCell className="px-2">{format(new Date(kas.date), 'dd/MM/yyyy')}</TableCell>
                  {user?.role === 'owner' && <TableCell className="px-2">{getBranchName(kas.branchId)}</TableCell>}
                  <TableCell className="font-medium px-2">{kas.description}</TableCell>
                  <TableCell className="text-right px-2 text-green-600 font-semibold">{kas.type === 'debit' ? formatCurrency(kas.total) : '-'}</TableCell>
                  <TableCell className="text-right px-2 text-red-600 font-semibold">{kas.type === 'credit' ? formatCurrency(kas.total) : '-'}</TableCell>
                  <TableCell className="text-right px-2 font-bold">{formatCurrency(kas.balance)}</TableCell>
                  <TableCell className="px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-6 w-6 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDialogOpen(kas)}><Edit className="mr-2 h-4 w-4" />Ubah</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(kas.id)}><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingKas ? 'Ubah Data Kas' : 'Tambah Data Kas'}
            </DialogTitle>
            <DialogDescription>
              Isi detail pemasukan atau pengeluaran.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Tanggal</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}>
                            {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Pilih tanggal</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date('1900-01-01')} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Uraian</FormLabel><FormControl><Input placeholder="cth. Pembelian ATK" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>Tipe</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Pilih Tipe" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="debit">Pemasukan (Debit)</SelectItem>
                        <SelectItem value="credit">Pengeluaran (Kredit)</SelectItem>
                      </SelectContent>
                    </Select>
                  <FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Jumlah</FormLabel><FormControl><Input type="number" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="unitPrice" render={({ field }) => (
                  <FormItem><FormLabel>Harga Satuan</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              {user?.role === 'owner' && (
                <FormField control={form.control} name="branchId" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Cabang</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!editingKas}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih Cabang" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )}/>
              )}
              <DialogFooter className="col-span-2">
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingKas ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    