
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, PlusCircle, MoreHorizontal, Edit, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { format, parse } from 'date-fns';

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import type { KasAngkutan, KasAngkutanInput, KioskDistribution } from '@/lib/types';
import { addKasAngkutan, getKasAngkutan, updateKasAngkutan, deleteKasAngkutan, deleteMultipleKasAngkutan } from '@/services/kasAngkutanService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { useBranch } from '@/hooks/use-branch';
import { useAuth } from '@/hooks/use-auth';

const kasAngkutanSchema = z.object({
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  type: z.enum(['pemasukan', 'pengeluaran'], { required_error: "Tipe transaksi harus dipilih"}),
  uangMasuk: z.coerce.number().min(0).default(0),
  pengeluaran: z.coerce.number().min(0).default(0),
  distributionId: z.string().optional(),
  uraian: z.string().min(1, { message: 'Uraian harus diisi' }),
}).superRefine((data, ctx) => {
    if (data.type === 'pemasukan' && data.uangMasuk <= 0) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['uangMasuk'],
            message: 'Uang Masuk harus lebih dari 0 untuk Pemasukan',
        });
    }
    if (data.type === 'pengeluaran' && !data.distributionId && data.pengeluaran <= 0) {
       ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pengeluaran'],
            message: 'Nominal Pengeluaran harus diisi jika NO DO tidak dipilih',
        });
    }
});

type SortConfig = {
  key: keyof KasAngkutan | 'branchName' | 'totalPengeluaran' | 'saldo' | 'nominal';
  direction: 'ascending' | 'descending';
} | null;

export default function KasAngkutanPage() {
  const { user } = useAuth();
  const { activeBranch, getBranchName, loading: branchLoading } = useBranch();
  const [kasList, setKasList] = useState<KasAngkutan[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKas, setEditingKas] = useState<KasAngkutan | null>(null);
  const [selectedKas, setSelectedKas] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' });
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      if (!activeBranch || branchLoading) return;
      try {
        setKasList(await getKasAngkutan(activeBranch.id));
        setDistributions(await getKioskDistributions(activeBranch.id));
      } catch (error) {
        toast({
          title: 'Gagal memuat data',
          description: 'Terjadi kesalahan saat memuat data.',
          variant: 'destructive',
        });
      }
    }
    loadData();
  }, [activeBranch, branchLoading, toast]);
  
  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    const formattedValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(value));
    return isNegative ? `(${formattedValue})` : formattedValue;
  };
  
  const sortedAndFilteredKasList = useMemo(() => {
    let filterableKas = [...kasList];

    if (searchQuery) {
        filterableKas = filterableKas.filter(kas =>
          (kas.doNumber && kas.doNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (kas.namaSopir && kas.namaSopir.toLowerCase().includes(searchQuery.toLowerCase())) ||
          kas.uraian.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // First, sort by date to calculate running balance correctly
    filterableKas.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const withBalance = filterableKas.map(kas => {
        const nominal = kas.uangMasuk;
        const calculatedExpenses = kas.adminFee + kas.uangMakan + kas.palang + kas.solar + kas.upahSopir + kas.lembur + kas.helper;
        const totalPengeluaran = kas.type === 'pengeluaran' ? (kas.doNumber ? calculatedExpenses : kas.pengeluaran) : 0;
        runningBalance += (kas.uangMasuk - totalPengeluaran);
        return { ...kas, nominal, totalPengeluaran, saldo: runningBalance };
    });

    if (sortConfig !== null) {
      withBalance.sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;
        
        const key = sortConfig.key as keyof typeof a;

        if (key === 'branchName') {
            aValue = getBranchName(a.branchId);
            bValue = getBranchName(b.branchId);
        } else if (key === 'date') {
            aValue = new Date(a.date);
            bValue = new Date(b.date);
        } else {
            aValue = a[key] as string | number;
            bValue = b[key] as string | number;
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

  const requestSort = (key: keyof KasAngkutan | 'branchName' | 'totalPengeluaran' | 'saldo' | 'nominal') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const summaryData = useMemo(() => {
    const totals = sortedAndFilteredKasList.reduce((acc, kas) => {
        acc.totalUangMasuk += kas.uangMasuk;
        acc.totalPengeluaran += (kas as any).totalPengeluaran;
        return acc;
    }, { totalUangMasuk: 0, totalPengeluaran: 0 });
    const lastKas = sortedAndFilteredKasList.length > 0 ? sortedAndFilteredKasList[sortedAndFilteredKasList.length - 1] : null;
    return { ...totals, sisaSaldo: lastKas ? (lastKas as any).saldo : 0 };
  }, [sortedAndFilteredKasList]);

  const distributionOptions = useMemo(() => {
      const usedDoNumbers = kasList.filter(k => k.type === 'pengeluaran' && k.doNumber).map(k => k.doNumber);
      return distributions
          .filter(d => !usedDoNumbers.includes(d.doNumber) || (editingKas && d.doNumber === editingKas.doNumber))
          .map(d => ({
              value: d.id,
              label: `${d.doNumber} - ${d.namaSopir}`
          }));
  }, [distributions, kasList, editingKas]);

  const form = useForm<z.infer<typeof kasAngkutanSchema>>({
    resolver: zodResolver(kasAngkutanSchema),
    defaultValues: { type: 'pengeluaran', uangMasuk: 0, pengeluaran: 0 }
  });

  const transactionType = useWatch({ control: form.control, name: 'type' });
  const distributionId = useWatch({ control: form.control, name: 'distributionId' });


  const handleDialogOpen = (kas: KasAngkutan | null) => {
    setEditingKas(kas);
    if (kas) {
      const dist = distributions.find(d => d.doNumber === kas.doNumber && d.namaSopir === kas.namaSopir);
      form.reset({
        ...kas,
        date: new Date(kas.date),
        type: kas.type,
        distributionId: dist?.id || '',
        pengeluaran: kas.pengeluaran || 0,
      });
    } else {
      form.reset({
        date: new Date(),
        type: 'pengeluaran',
        uangMasuk: 0,
        pengeluaran: 0,
        distributionId: '',
        uraian: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKasAngkutan(id);
      setKasList(kasList.filter((k) => k.id !== id));
      toast({ title: 'Sukses', description: 'Data kas berhasil dihapus.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus data kas.', variant: 'destructive' });
    }
  };
  
  const handleDeleteSelected = async () => {
    try {
      await deleteMultipleKasAngkutan(selectedKas);
      setKasList(kasList.filter(k => !selectedKas.includes(k.id)));
      setSelectedKas([]);
      toast({ title: 'Sukses', description: `${selectedKas.length} data kas berhasil dihapus.` });
    } catch (error) {
       toast({ title: 'Error', description: 'Gagal menghapus data kas terpilih.', variant: 'destructive' });
    }
  };

  const onSubmit = async (values: z.infer<typeof kasAngkutanSchema>) => {
    if (!activeBranch || activeBranch.id === 'all') {
      toast({ title: 'Error', description: 'Pilih cabang spesifik.', variant: 'destructive' });
      return;
    }
    
    let kasData: KasAngkutanInput;

    if (values.type === 'pengeluaran') {
        if (values.distributionId) {
            const distribution = distributions.find(d => d.id === values.distributionId);
            if (!distribution) {
              toast({ title: 'Error', description: 'Data distribusi tidak ditemukan.', variant: 'destructive' });
              return;
            }
            const qty = distribution.quantity;
            const jamAngkut = parse(distribution.jamAngkut, 'HH:mm', new Date());
            const jamLembur = parse('14:00', 'HH:mm', new Date());
            kasData = {
                date: values.date.toISOString(),
                type: 'pengeluaran',
                uangMasuk: 0,
                pengeluaran: 0,
                doNumber: distribution.doNumber,
                namaSopir: distribution.namaSopir,
                uraian: values.uraian || `Biaya DO: ${distribution.doNumber}`,
                adminFee: 3125 * qty,
                uangMakan: 40000,
                palang: 5000 * qty,
                solar: 12500 * qty,
                upahSopir: 3500 * qty,
                lembur: jamAngkut > jamLembur ? 2000 * qty : 0,
                helper: 5000 * qty,
                branchId: activeBranch.id,
            };
        } else {
             kasData = {
                date: values.date.toISOString(),
                type: 'pengeluaran',
                uangMasuk: 0,
                pengeluaran: values.pengeluaran,
                uraian: values.uraian,
                adminFee: 0, uangMakan: 0, palang: 0, solar: 0, upahSopir: 0, lembur: 0, helper: 0,
                branchId: activeBranch.id,
            };
        }
    } else { // Pemasukan
        kasData = {
            date: values.date.toISOString(),
            type: 'pemasukan',
            uangMasuk: values.uangMasuk,
            pengeluaran: 0,
            uraian: values.uraian,
            adminFee: 0, uangMakan: 0, palang: 0, solar: 0, upahSopir: 0, lembur: 0, helper: 0,
            branchId: activeBranch.id,
        };
    }

    try {
      if (editingKas) {
        await updateKasAngkutan(editingKas.id, kasData);
        setKasList(kasList.map((k) => (k.id === editingKas.id ? { ...editingKas, ...kasData } : k)));
        toast({ title: 'Sukses', description: 'Data kas berhasil diperbarui.' });
      } else {
        const newKas = await addKasAngkutan(kasData);
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
  
  if (branchLoading) {
    return <div>Loading...</div>
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Kas Angkutan</h1>
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
                  <CardTitle className="text-sm font-medium text-green-600">Total Uang Masuk</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalUangMasuk)}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-600">Total Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalPengeluaran)}</div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sisa Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.sisaSaldo)}</div>
              </CardContent>
          </Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table className="whitespace-nowrap text-xs">
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                 <TableHead className="w-[40px] px-2">
                   <Checkbox
                    checked={sortedAndFilteredKasList.length > 0 && selectedKas.length === sortedAndFilteredKasList.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('date')}>Tgl <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('doNumber')}>NO DO <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('namaSopir')}>Sopir<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('uraian')}>Uraian<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                {user?.role === 'owner' && <TableHead><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('branchName')}>Kab. <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>}
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('nominal')}>Nominal<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('adminFee')}>Admin<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('uangMakan')}>U. Makan<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('palang')}>Palang<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('solar')}>Solar<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('upahSopir')}>U. Sopir<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('lembur')}>Lembur<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('helper')}>Helper<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('totalPengeluaran')}>Total Keluar<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right"><Button className="px-1 text-xs" variant="ghost" onClick={() => requestSort('saldo')}>Saldo<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="w-[40px] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredKasList.map((kas) => (
                <TableRow key={kas.id} data-state={selectedKas.includes(kas.id) && "selected"}>
                   <TableCell className="px-2">
                    <Checkbox
                      checked={selectedKas.includes(kas.id)}
                      onCheckedChange={(checked) => handleSelectKas(kas.id, !!checked)}
                      aria-label={`Pilih ${kas.id}`}
                    />
                  </TableCell>
                  <TableCell className="px-2">{format(new Date(kas.date), 'dd/MM/yy')}</TableCell>
                  <TableCell className="px-2 font-medium">{kas.doNumber || '-'}</TableCell>
                  <TableCell className="px-2 font-medium">{kas.namaSopir || '-'}</TableCell>
                  <TableCell className="px-2 font-medium">{kas.uraian}</TableCell>
                  {user?.role === 'owner' && <TableCell className="px-2">{getBranchName(kas.branchId)}</TableCell>}
                  <TableCell className="px-2 text-right font-semibold text-green-600">{kas.type === 'pemasukan' ? formatCurrency((kas as any).nominal) : '-'}</TableCell>
                  <TableCell className="px-2 text-right">{kas.doNumber ? formatCurrency(kas.adminFee) : '-'}</TableCell>
                  <TableCell className="px-2 text-right">{kas.doNumber ? formatCurrency(kas.uangMakan) : '-'}</TableCell>
                  <TableCell className="px-2 text-right">{kas.doNumber ? formatCurrency(kas.palang) : '-'}</TableCell>
                  <TableCell className="px-2 text-right">{kas.doNumber ? formatCurrency(kas.solar) : '-'}</TableCell>
                  <TableCell className="px-2 text-right">{kas.doNumber ? formatCurrency(kas.upahSopir) : '-'}</TableCell>
                  <TableCell className="px-2 text-right">{kas.doNumber ? formatCurrency(kas.lembur) : '-'}</TableCell>
                  <TableCell className="px-2 text-right">{kas.doNumber ? formatCurrency(kas.helper) : '-'}</TableCell>
                  <TableCell className="px-2 text-right font-semibold text-red-600">{formatCurrency((kas as any).totalPengeluaran)}</TableCell>
                  <TableCell className="px-2 text-right font-bold">{formatCurrency((kas as any).saldo)}</TableCell>
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
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingKas ? 'Ubah Data Kas Angkutan' : 'Tambah Data Kas Angkutan'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 py-4">
              <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                      <FormItem className="space-y-3">
                          <FormLabel>Tipe Transaksi</FormLabel>
                          <FormControl>
                              <RadioGroup
                                  onValueChange={(value) => {
                                      field.onChange(value);
                                      form.reset({
                                          ...form.getValues(),
                                          type: value as 'pemasukan' | 'pengeluaran',
                                          distributionId: '',
                                          uangMasuk: 0,
                                          pengeluaran: 0,
                                          uraian: ''
                                      });
                                  }}
                                  value={field.value}
                                  className="flex space-x-4"
                                  disabled={!!editingKas}
                              >
                                  <FormItem className="flex items-center space-x-2">
                                      <FormControl><RadioGroupItem value="pemasukan" id="pemasukan" /></FormControl>
                                      <FormLabel htmlFor="pemasukan" className="cursor-pointer font-normal">Pemasukan</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2">
                                      <FormControl><RadioGroupItem value="pengeluaran" id="pengeluaran" /></FormControl>
                                      <FormLabel htmlFor="pengeluaran" className="cursor-pointer font-normal">Pengeluaran</FormLabel>
                                  </FormItem>
                              </RadioGroup>
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
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
               {transactionType === 'pengeluaran' && (
                  <>
                    <FormField
                        control={form.control}
                        name="distributionId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Distribusi (NO DO - Sopir) - Opsional</FormLabel>
                                <Combobox
                                    options={distributionOptions}
                                    value={field.value || ""}
                                    onChange={(value) => {
                                        field.onChange(value);
                                        form.setValue('pengeluaran', 0); // Reset manual expense if DO is selected
                                    }}
                                    placeholder="Pilih Distribusi (jika ada)"
                                    searchPlaceholder="Cari NO DO atau Sopir..."
                                    emptyPlaceholder="Distribusi tidak ditemukan"
                                    disabled={!!editingKas}
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="pengeluaran" render={({ field }) => (
                      <FormItem><FormLabel>Nominal Pengeluaran</FormLabel><FormControl><Input type="number" placeholder="0" {...field} disabled={!!distributionId} /></FormControl><FormMessage /></FormItem>
                    )}/>
                  </>
               )}

               {transactionType === 'pemasukan' && (
                  <FormField control={form.control} name="uangMasuk" render={({ field }) => (
                    <FormItem><FormLabel>Uang Masuk</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                  )}/>
               )}

              <FormField control={form.control} name="uraian" render={({ field }) => (
                  <FormItem><FormLabel>Uraian</FormLabel><FormControl><Input placeholder="cth. Pemasukan dari kasir atau Biaya tak terduga" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>

              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingKas ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
