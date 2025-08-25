
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { Payment, Kiosk, KioskDistribution, Product, Redemption, PaymentInput } from '@/lib/types';
import { getPayments, addPayment, updatePayment, deletePayment, deleteMultiplePayments, addMultiplePayments } from '@/services/paymentService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { exportToPdf } from '@/lib/pdf-export';
import { useBranch } from '@/hooks/use-branch';


const paymentSchema = z.object({
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  kioskId: z.string().min(1, { message: 'Kios harus dipilih' }),
  amount: z.coerce.number().min(1, { message: 'Jumlah bayar harus lebih dari 0' }),
});

type SortConfig = {
  key: keyof Payment | 'kioskName';
  direction: 'ascending' | 'descending';
} | null;

function OutstandingBalanceDisplay({ control, distributions, redemptions, products, payments, editingPayment }: { control: any, distributions: KioskDistribution[], redemptions: Redemption[], products: Product[], payments: Payment[], editingPayment: Payment | null }) {
    const doNumber = useWatch({ control, name: 'doNumber' });
    const kioskId = useWatch({ control, name: 'kioskId' });
    const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const outstandingBalance = useMemo(() => {
        if (!doNumber || !kioskId) return 0;

        const relevantDistribution = distributions.find(d => d.doNumber === doNumber && d.kioskId === kioskId);
        if (!relevantDistribution) return 0;
        
        const redemption = redemptions.find(r => r.doNumber === doNumber);
        const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
        if (!product) return 0;

        const totalValue = relevantDistribution.quantity * product.sellPrice;
        const totalPaidViaTempo = payments
            .filter(p => p.doNumber === doNumber && p.kioskId === kioskId && p.id !== editingPayment?.id)
            .reduce((sum, p) => sum + p.amount, 0);

        return totalValue - relevantDistribution.directPayment - totalPaidViaTempo;
    }, [doNumber, kioskId, distributions, redemptions, products, payments, editingPayment]);

    if (outstandingBalance <= 0) return null;

    return (
        <FormItem>
            <FormLabel>Sisa Tagihan</FormLabel>
            <FormControl>
                <Input type="text" readOnly value={formatCurrency(outstandingBalance)} className="font-semibold" />
            </FormControl>
        </FormItem>
    );
}

export default function PembayaranPage() {
  const { activeBranch, loading: branchLoading } = useBranch();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<{key: 'kioskId' | 'none', value: string}>({key: 'none', value: 'all'});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
        if (!activeBranch) return;
      try {
        setPayments(await getPayments(activeBranch.id));
        setDistributions(await getKioskDistributions(activeBranch.id));
        setKiosks(await getKiosks(activeBranch.id));
        setProducts(await getProducts(activeBranch.id));
        setRedemptions(await getRedemptions(activeBranch.id));
      } catch (error) {
        toast({
          title: 'Gagal memuat data',
          description: 'Terjadi kesalahan saat memuat data dari database.',
          variant: 'destructive',
        });
      }
    }
    loadData();
  }, [activeBranch, toast]);
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const getKioskName = (kioskId: string) => kiosks.find(k => k.id === kioskId)?.name || 'N/A';
  
  const sortedAndFilteredPayments = useMemo(() => {
    let filterablePayments = [...payments];

    if (searchQuery) {
        filterablePayments = filterablePayments.filter(payment =>
          payment.doNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getKioskName(payment.kioskId).toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    if (groupFilter.key !== 'none' && groupFilter.value !== 'all') {
        filterablePayments = filterablePayments.filter(p => p[groupFilter.key] === groupFilter.value);
    }
    
    if (sortConfig !== null) {
      filterablePayments.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.key === 'kioskName') {
          aValue = getKioskName(a.kioskId);
          bValue = getKioskName(b.kioskId);
        } else {
          aValue = a[sortConfig.key as keyof Payment];
          bValue = b[sortConfig.key as keyof Payment];
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

    return filterablePayments;
  }, [payments, searchQuery, groupFilter, sortConfig, kiosks]);
  
  const requestSort = (key: keyof Payment | 'kioskName') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const groupingOptions: {key: 'kioskId', label: string}[] = [
    { key: 'kioskId', label: 'Nama Kios' },
  ];

  const uniqueGroupValues = useMemo(() => {
    if (groupFilter.key === 'none') return [];
    if (groupFilter.key === 'kioskId') {
      return [...new Set(payments.map(p => p.kioskId))].map(kioskId => ({
        value: kioskId,
        label: getKioskName(kioskId)
      }));
    }
    return [];
  }, [payments, groupFilter.key, kiosks]);

  const summaryData = useMemo(() => {
    return sortedAndFilteredPayments.reduce((acc, payment) => {
        acc.totalPayments += payment.amount;
        return acc;
    }, { totalPayments: 0 });
  }, [sortedAndFilteredPayments]);


  const form = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { date: new Date(), doNumber: '', kioskId: '', amount: 0 },
  });
  

  const uniqueDistributions = useMemo(() => {
    const seen = new Set<string>();
    return distributions.filter(d => {
        const key = `${d.doNumber}-${d.kioskId}`;
        const redemption = redemptions.find(r => r.doNumber === d.doNumber);
        const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
        if (!product) return false;
        
        const totalValue = d.quantity * product.sellPrice;
        const totalPaid = payments
            .filter(p => p.doNumber === d.doNumber && p.kioskId === d.kioskId)
            .reduce((sum, p) => sum + p.amount, 0);
        
        const outstanding = totalValue - d.directPayment - totalPaid;

        if(seen.has(key) || outstanding <= 0) {
            return false;
        }
        seen.add(key);
        return true;
    });
  }, [distributions, payments, redemptions, products]);
  
  const distributionOptions = useMemo(() => {
    return uniqueDistributions.map(d => ({
        value: `${d.doNumber}|${d.kioskId}`,
        label: `${d.doNumber} - ${getKioskName(d.kioskId)}`
    }));
  }, [uniqueDistributions, kiosks]);


  const handleDialogOpen = (payment: Payment | null) => {
    setEditingPayment(payment);
    if (payment) form.reset({ ...payment, date: new Date(payment.date) });
    else form.reset({ date: new Date(), doNumber: '', kioskId: '', amount: 0 });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePayment(id);
      setPayments(payments.filter((p) => p.id !== id));
      toast({ title: 'Sukses', description: 'Data pembayaran berhasil dihapus.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus pembayaran.', variant: 'destructive' });
    }
  };
  
  const handleDeleteSelected = async () => {
    try {
      await deleteMultiplePayments(selectedPayments);
      setPayments(payments.filter(p => !selectedPayments.includes(p.id)));
      setSelectedPayments([]);
      toast({
        title: 'Sukses',
        description: `${selectedPayments.length} pembayaran berhasil dihapus.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus pembayaran terpilih.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof paymentSchema>) => {
    if (!activeBranch) return;
    try {
      const paymentData = { ...values, date: values.date.toISOString(), branchId: activeBranch.id };
      if (editingPayment) {
        await updatePayment(editingPayment.id, paymentData);
        setPayments(payments.map((p) => (p.id === editingPayment.id ? { id: p.id, ...paymentData } : p)));
        toast({ title: 'Sukses', description: 'Data pembayaran berhasil diperbarui.' });
      } else {
        const newPayment = await addPayment(paymentData);
        setPayments([...payments, newPayment]);
        toast({ title: 'Sukses', description: 'Pembayaran baru berhasil ditambahkan.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan pembayaran.', variant: 'destructive' });
    }
  };
  
  const handleLunas = () => {
    const doNumber = form.getValues('doNumber');
    const kioskId = form.getValues('kioskId');

    if (!doNumber || !kioskId) return;

    const relevantDistribution = distributions.find(d => d.doNumber === doNumber && d.kioskId === kioskId);
    if (!relevantDistribution) return;

    const redemption = redemptions.find(r => r.doNumber === doNumber);
    const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
    if (!product) return;

    const totalValue = relevantDistribution.quantity * product.sellPrice;
    const totalPaidViaTempo = payments
        .filter(p => p.doNumber === doNumber && p.kioskId === kioskId && p.id !== editingPayment?.id)
        .reduce((sum, p) => sum + p.amount, 0);

    const outstandingBalance = totalValue - relevantDistribution.directPayment - totalPaidViaTempo;
    
    if (outstandingBalance > 0) {
      form.setValue('amount', outstandingBalance);
    }
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPayments(sortedAndFilteredPayments.map(p => p.id));
    } else {
      setSelectedPayments([]);
    }
  };

  const handleSelectPayment = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedPayments([...selectedPayments, id]);
    } else {
      setSelectedPayments(selectedPayments.filter(pid => pid !== id));
    }
  };
  
  const handleExportExcel = () => {
    const dataToExport = sortedAndFilteredPayments.map(p => ({
        'Tanggal': format(new Date(p.date), 'dd/MM/yyyy'),
        'NO DO': p.doNumber,
        'Nama Kios': getKioskName(p.kioskId),
        'Total Bayar': p.amount,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pembayaran");
    XLSX.writeFile(workbook, "DataPembayaran.xlsx");
     toast({
        title: 'Sukses',
        description: 'Data pembayaran berhasil diekspor ke Excel.',
      });
  };

  const handleExportPdf = () => {
    const headers = [['Tanggal', 'NO DO', 'Nama Kios', 'Total Bayar']];
    const data = sortedAndFilteredPayments.map(p => [
      format(new Date(p.date), 'dd/MM/yyyy'),
      p.doNumber,
      getKioskName(p.kioskId),
      formatCurrency(p.amount)
    ]);
    exportToPdf('Data Pembayaran', headers, data);
    toast({
      title: 'Sukses',
      description: 'Data pembayaran berhasil diekspor ke PDF.',
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeBranch) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            const kioskNameToIdMap = kiosks.reduce((map, k) => {
              map[k.name] = k.id;
              return map;
            }, {} as Record<string, string>);

            const newPayments: PaymentInput[] = [];
            for (const item of json) {
                const excelDate = typeof item['Tanggal'] === 'number' ? new Date(1900, 0, item['Tanggal'] - 1) : new Date(item['Tanggal']);
                const kioskId = kioskNameToIdMap[item['Nama Kios']];
                if (!kioskId) {
                  console.warn(`Kiosk not found for: ${item['Nama Kios']}`);
                  continue;
                }

                const paymentData = {
                    date: excelDate,
                    doNumber: String(item['NO DO']),
                    kioskId: kioskId,
                    amount: item['Total Bayar'],
                    branchId: activeBranch.id,
                };
                
                const parsed = paymentSchema.strip().safeParse(paymentData);
                if (parsed.success) {
                    newPayments.push({
                      ...parsed.data,
                      date: parsed.data.date.toISOString(),
                      branchId: activeBranch.id
                    });
                } else {
                    console.warn('Invalid item skipped:', item, parsed.error);
                }
            }

            if (newPayments.length > 0) {
                const addedPayments = await addMultiplePayments(newPayments);
                setPayments(prev => [...prev, ...addedPayments]);
                toast({
                    title: 'Sukses',
                    description: `${addedPayments.length} pembayaran berhasil diimpor.`,
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
                description: 'Gagal mengimpor file. Pastikan format file, NO DO dan nama kios benar.',
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

  if (branchLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <div className="flex items-center gap-4">
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Pembayaran</h1>
        <div className="ml-auto flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari..."
              className="w-full rounded-lg bg-background md:w-[200px] lg:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select onValueChange={(key) => setGroupFilter({ key: key as 'kioskId' | 'none', value: 'all' })} value={groupFilter.key}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kelompokkan Data" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Tidak Dikelompokkan</SelectItem>
                    {groupingOptions.map(opt => <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>)}
                </SelectContent>
            </Select>
            {groupFilter.key !== 'none' && (
              <Select onValueChange={(value) => setGroupFilter(prev => ({ ...prev, value }))} value={groupFilter.value}>
                  <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={`Filter ${groupingOptions.find(o => o.key === groupFilter.key)?.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      {uniqueGroupValues.map(val => <SelectItem key={val.value} value={val.value}>{val.label}</SelectItem>)}
                  </SelectContent>
              </Select>
            )}
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
          {selectedPayments.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus ({selectedPayments.length})
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleDialogOpen(null)}><PlusCircle className="mr-2 h-4 w-4" />Tambah Pembayaran</Button>
          )}
        </div>
      </div>
      <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pembayaran Diterima</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summaryData.totalPayments)}</div>
              <p className="text-xs text-muted-foreground">Jumlah semua pembayaran tempo yang diterima</p>
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
                    checked={sortedAndFilteredPayments.length > 0 && selectedPayments.length === sortedAndFilteredPayments.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('date')}>Tanggal<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('doNumber')}>NO DO<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('kioskName')}>Nama Kios<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('amount')}>Total Bayar<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="w-[40px] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredPayments.map((payment) => (
                <TableRow key={payment.id} data-state={selectedPayments.includes(payment.id) && "selected"}>
                  <TableCell className="px-2">
                    <Checkbox
                      checked={selectedPayments.includes(payment.id)}
                      onCheckedChange={(checked) => handleSelectPayment(payment.id, !!checked)}
                      aria-label={`Pilih pembayaran ${payment.id}`}
                    />
                  </TableCell>
                  <TableCell className="px-2">{format(new Date(payment.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="font-medium px-2">{payment.doNumber}</TableCell>
                  <TableCell className="px-2">{getKioskName(payment.kioskId)}</TableCell>
                  <TableCell className="text-right px-2">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-6 w-6 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDialogOpen(payment)}><Edit className="mr-2 h-4 w-4" />Ubah</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(payment.id)}><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownMenuItem>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="font-headline">{editingPayment ? 'Ubah' : 'Tambah'} Pembayaran</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
              <FormField
                control={form.control}
                name="doNumber"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Transaksi (NO DO - Kios)</FormLabel>
                        <Combobox
                            options={distributionOptions}
                            value={`${form.getValues('doNumber')}|${form.getValues('kioskId')}`}
                            onChange={(value) => {
                                const [doNum, kioskId] = value.split('|');
                                form.setValue('doNumber', doNum);
                                form.setValue('kioskId', kioskId);
                            }}
                            placeholder="Pilih transaksi"
                            searchPlaceholder="Cari transaksi..."
                            emptyPlaceholder="Transaksi tidak ditemukan."
                            disabled={!!editingPayment}
                        />
                        <FormMessage />
                    </FormItem>
                )}
            />

               <FormField name="kioskId" control={form.control} render={({ field }) => (<FormItem className="hidden"><Input {...field} /></FormItem>)} />
              
              <OutstandingBalanceDisplay 
                control={form.control}
                distributions={distributions}
                redemptions={redemptions}
                products={products}
                payments={payments}
                editingPayment={editingPayment}
              />

              <FormField name="amount" control={form.control} render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Total Bayar</FormLabel>
                    <Button type="button" size="sm" variant="secondary" onClick={handleLunas}>
                      LUNAS
                    </Button>
                  </div>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingPayment ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
