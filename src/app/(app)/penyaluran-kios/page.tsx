
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
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import type { KioskDistribution, Kiosk, Product, Redemption, Payment, DORelease, KioskDistributionInput } from '@/lib/types';
import { getKioskDistributions, addKioskDistribution, updateKioskDistribution, deleteKioskDistribution, deleteMultipleKioskDistributions, addMultipleKioskDistributions } from '@/services/kioskDistributionService';
import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { getPayments } from '@/services/paymentService';
import { getDOReleases } from '@/services/doReleaseService';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { exportToPdf } from '@/lib/pdf-export';
import { useBranch } from '@/hooks/use-branch';
import { useAuth } from '@/hooks/use-auth';

const distributionSchema = z.object({
  doNumber: z.string().min(1, { message: 'NO DO harus dipilih' }),
  date: z.date({ required_error: 'Tanggal harus diisi' }),
  kioskId: z.string().min(1, { message: 'Kios harus dipilih' }),
  namaSopir: z.string().min(1, { message: 'Nama Sopir harus diisi' }),
  jamAngkut: z.string().min(1, { message: 'Jam Angkut harus diisi (e.g., 14:30)'}).regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam tidak valid (HH:MM)"),
  quantity: z.coerce.number().min(1, { message: 'QTY harus lebih dari 0' }),
  directPayment: z.coerce.number().min(0, { message: 'Pembayaran harus positif' }),
});

type SortConfig = {
  key: keyof KioskDistribution | 'productName' | 'kioskName' | 'total' | 'paymentTempo' | 'kurangBayar' | 'branchName';
  direction: 'ascending' | 'descending';
} | null;

export default function PenyaluranKiosPage() {
  const { user } = useAuth();
  const { activeBranch, getBranchName, loading: branchLoading } = useBranch();
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [doReleases, setDoReleases] = useState<DORelease[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDist, setEditingDist] = useState<KioskDistribution | null>(null);
  const [selectedDists, setSelectedDists] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<{key: 'kioskId' | 'doNumber' | 'none', value: string}>({key: 'none', value: 'all'});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!activeBranch) return;
      try {
        setDistributions(await getKioskDistributions(activeBranch.id));
        setDoReleases(await getDOReleases(activeBranch.id));
        setRedemptions(await getRedemptions(activeBranch.id));
        setProducts(await getProducts(activeBranch.id));
        setKiosks(await getKiosks(activeBranch.id));
        setPayments(await getPayments(activeBranch.id));
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
  
  const getKioskName = (kioskId: string) => kiosks.find(k => k.id === kioskId)?.name || 'N/A';
  
  const getDetails = (doNumber: string) => {
    const redemption = redemptions.find(r => r.doNumber === doNumber);
    const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
    const doRelease = doReleases.find(d => d.doNumber === doNumber);
    return { redemption, product, doRelease };
  }
  
  const sortedAndFilteredDistributions = useMemo(() => {
    let filterableDistributions = [...distributions];

    if (searchQuery) {
        filterableDistributions = filterableDistributions.filter(dist => {
            const { product } = getDetails(dist.doNumber);
            return dist.doNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                   getKioskName(dist.kioskId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                   (product && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                   (dist.namaSopir && dist.namaSopir.toLowerCase().includes(searchQuery.toLowerCase()));
        });
    }

    if (groupFilter.key !== 'none' && groupFilter.value !== 'all') {
        filterableDistributions = filterableDistributions.filter(d => d[groupFilter.key] === groupFilter.value);
    }
    
    if (sortConfig !== null) {
      filterableDistributions.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;
        
        const { product: productA } = getDetails(a.doNumber);
        const { product: productB } = getDetails(b.doNumber);
        
        const paymentTempoA = payments.filter(p => p.doNumber === a.doNumber && p.kioskId === a.kioskId).reduce((sum, p) => sum + p.amount, 0);
        const paymentTempoB = payments.filter(p => p.doNumber === b.doNumber && p.kioskId === b.kioskId).reduce((sum, p) => sum + p.amount, 0);

        switch (sortConfig.key) {
            case 'productName':
                aValue = productA?.name || '';
                bValue = productB?.name || '';
                break;
            case 'kioskName':
                aValue = getKioskName(a.kioskId);
                bValue = getKioskName(b.kioskId);
                break;
            case 'total':
                aValue = productA ? a.quantity * productA.sellPrice : 0;
                bValue = productB ? b.quantity * productB.sellPrice : 0;
                break;
            case 'paymentTempo':
                aValue = paymentTempoA;
                bValue = paymentTempoB;
                break;
            case 'kurangBayar':
                const totalA = productA ? a.quantity * productA.sellPrice : 0;
                aValue = totalA - a.directPayment - paymentTempoA;

                const totalB = productB ? b.quantity * productB.sellPrice : 0;
                bValue = totalB - b.directPayment - paymentTempoB;
                break;
            case 'branchName':
                 aValue = getBranchName(a.branchId);
                 bValue = getBranchName(b.branchId);
                 break;
            default:
                aValue = a[sortConfig.key as keyof KioskDistribution];
                bValue = b[sortConfig.key as keyof KioskDistribution];
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

    return filterableDistributions;
  }, [distributions, searchQuery, groupFilter, sortConfig, kiosks, redemptions, products, payments, getBranchName]);

  const requestSort = (key: keyof KioskDistribution | 'productName' | 'kioskName' | 'total' | 'paymentTempo' | 'kurangBayar' | 'branchName') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const groupingOptions: {key: 'kioskId' | 'doNumber' | 'none', label: string}[] = [
    { key: 'none', label: 'Tidak Dikelompokkan' },
    { key: 'kioskId', label: 'Nama Kios' },
    { key: 'doNumber', label: 'NO DO'}
  ];

  const uniqueGroupValues = useMemo(() => {
    if (groupFilter.key === 'none') return [];
    if (groupFilter.key === 'kioskId') {
      return [...new Set(distributions.map(p => p.kioskId))].map(kioskId => ({
        value: kioskId,
        label: getKioskName(kioskId)
      }));
    }
    return [...new Set(distributions.map(d => d[groupFilter.key as 'doNumber']))].map(val => ({
        value: val,
        label: val
    }));
  }, [distributions, groupFilter.key, kiosks]);
  
  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    const formattedValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(value));
    return isNegative ? `(${formattedValue})` : formattedValue;
  }
  
  const summaryData = useMemo(() => {
    return sortedAndFilteredDistributions.reduce((acc, dist) => {
        const { product } = getDetails(dist.doNumber);
        const total = product ? dist.quantity * product.sellPrice : 0;
        const totalTempo = payments.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0);
        const kurangBayar = total - dist.directPayment - totalTempo;
        
        acc.totalQty += dist.quantity;
        if(kurangBayar > 0) {
            acc.totalOutstanding += kurangBayar;
        }
        return acc;
    }, { totalQty: 0, totalOutstanding: 0 });
  }, [sortedAndFilteredDistributions, products, redemptions, payments]);

  const form = useForm<z.infer<typeof distributionSchema>>({
    resolver: zodResolver(distributionSchema),
    defaultValues: { doNumber: '', date: new Date(), kioskId: '', namaSopir: '', jamAngkut: '', quantity: 1, directPayment: 0 },
  });
  
  const productMap = useMemo(() => {
    return products.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {} as Record<string, Product>);
  }, [products]);
  
  const doOptions = useMemo(() => {
    return doReleases.map(r => ({
      value: r.doNumber,
      label: `${r.doNumber} (${getDetails(r.doNumber).product?.name || 'N/A'})`,
    }));
  }, [doReleases, products, redemptions]);

  const kioskOptions = useMemo(() => {
    return kiosks.map(k => ({
      value: k.id,
      label: k.name,
    }));
  }, [kiosks]);

  const handleDialogOpen = (dist: KioskDistribution | null) => {
    setEditingDist(dist);
    if (dist) form.reset({ ...dist, date: new Date(dist.date) });
    else form.reset({ doNumber: '', date: new Date(), kioskId: '', namaSopir: '', jamAngkut: '', quantity: 1, directPayment: 0 });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteKioskDistribution(id);
      setDistributions(distributions.filter((d) => d.id !== id));
      toast({ title: 'Sukses', description: 'Data penyaluran berhasil dihapus.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus data penyaluran.', variant: 'destructive' });
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteMultipleKioskDistributions(selectedDists);
      setDistributions(distributions.filter(d => !selectedDists.includes(d.id)));
      setSelectedDists([]);
      toast({
        title: 'Sukses',
        description: `${selectedDists.length} penyaluran berhasil dihapus.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus penyaluran terpilih.',
        variant: 'destructive',
      });
    }
  };


  const onSubmit = async (values: z.infer<typeof distributionSchema>) => {
    if (!activeBranch || activeBranch.id === 'all') {
        toast({ title: 'Aksi Tidak Diizinkan', description: 'Silakan pilih cabang spesifik untuk menambah/mengubah data.', variant: 'destructive' });
        return;
    }
    const { doRelease } = getDetails(values.doNumber);
    const distributedQty = distributions.filter(d => d.doNumber === values.doNumber && d.id !== editingDist?.id).reduce((sum, d) => sum + d.quantity, 0);

    if (doRelease && (values.quantity + distributedQty > doRelease.quantity)) {
        form.setError("quantity", { type: "manual", message: `QTY melebihi sisa DO (${doRelease.quantity - distributedQty})` });
        return;
    }
    
    const distributionData = { ...values, date: values.date.toISOString(), branchId: activeBranch.id };

    try {
      if (editingDist) {
        await updateKioskDistribution(editingDist.id, distributionData);
        setDistributions(distributions.map((d) => (d.id === editingDist.id ? { id: d.id, ...distributionData } : d)));
        toast({ title: 'Sukses', description: 'Data penyaluran berhasil diperbarui.' });
      } else {
        const newDist = await addKioskDistribution(distributionData);
        setDistributions([...distributions, newDist]);
        toast({ title: 'Sukses', description: 'Penyaluran baru berhasil ditambahkan.' });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan data penyaluran.', variant: 'destructive' });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDists(sortedAndFilteredDistributions.map(d => d.id));
    } else {
      setSelectedDists([]);
    }
  };

  const handleSelectDist = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDists([...selectedDists, id]);
    } else {
      setSelectedDists(selectedDists.filter(did => did !== id));
    }
  };

  const handleExportExcel = () => {
    const dataToExport = sortedAndFilteredDistributions.map(dist => {
        const { product } = getDetails(dist.doNumber);
        const total = product ? dist.quantity * product.sellPrice : 0;
        const totalTempo = payments.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0);
        const kurangBayar = total - dist.directPayment - totalTempo;
        const keterangan = kurangBayar <= 0 ? "Lunas" : "Belum Lunas";
        return {
            'NO DO': dist.doNumber,
            'Tanggal': format(new Date(dist.date), 'dd/MM/yyyy'),
            'Kabupaten': user?.role === 'owner' ? getBranchName(dist.branchId) : undefined,
            'Nama Produk': product?.name || 'N/A',
            'Nama Kios': getKioskName(dist.kioskId),
            'Nama Sopir': dist.namaSopir,
            'Jam Angkut': dist.jamAngkut,
            'QTY': dist.quantity,
            'Total': total,
            'Dibayar Langsung': dist.directPayment,
            'Pembayaran Tempo': totalTempo,
            'Kurang Bayar': kurangBayar,
            'Keterangan': keterangan,
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PenyaluranKios");
    XLSX.writeFile(workbook, "DataPenyaluranKios.xlsx");
     toast({
        title: 'Sukses',
        description: 'Data penyaluran kios berhasil diekspor ke Excel.',
      });
  };

  const handleExportPdf = () => {
    const headers = user?.role === 'owner'
        ? [['NO DO', 'Tanggal', 'Kabupaten', 'Nama Kios', 'Nama Sopir', 'QTY', 'Total', 'Kurang Bayar']]
        : [['NO DO', 'Tanggal', 'Nama Kios', 'Nama Sopir', 'QTY', 'Total', 'Kurang Bayar']];
        
    const data = sortedAndFilteredDistributions.map(dist => {
        const { product } = getDetails(dist.doNumber);
        const total = product ? dist.quantity * product.sellPrice : 0;
        const totalTempo = payments.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0);
        const kurangBayar = total - dist.directPayment - totalTempo;
        const commonData = [
            dist.doNumber,
            format(new Date(dist.date), 'dd/MM/yyyy'),
            getKioskName(dist.kioskId),
            dist.namaSopir,
            dist.quantity.toLocaleString('id-ID'),
            formatCurrency(total),
            formatCurrency(kurangBayar)
        ];
        return user?.role === 'owner' ? [commonData[0], commonData[1], getBranchName(dist.branchId), ...commonData.slice(2)] : commonData;
    });
    exportToPdf('Data Penyaluran Kios', headers, data);
    toast({
      title: 'Sukses',
      description: 'Data penyaluran kios berhasil diekspor ke PDF.',
    });
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeBranch || activeBranch.id === 'all') {
        toast({ title: 'Aksi Tidak Diizinkan', description: 'Silakan pilih cabang spesifik untuk mengimpor data.', variant: 'destructive' });
        return;
    }

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

            const newDistributions: KioskDistributionInput[] = [];
            for (const item of json) {
                const excelDate = typeof item['Tanggal'] === 'number' ? new Date(1900, 0, item['Tanggal'] - 1) : new Date(item['Tanggal']);
                const kioskId = kioskNameToIdMap[item['Nama Kios']];
                 if (!kioskId) {
                  console.warn(`Kiosk not found for: ${item['Nama Kios']}`);
                  continue;
                }

                const distData = {
                    doNumber: String(item['NO DO']),
                    date: excelDate,
                    kioskId: kioskId,
                    namaSopir: item['Nama Sopir'],
                    jamAngkut: item['Jam Angkut'],
                    quantity: item['QTY'],
                    directPayment: item['Dibayar Langsung'] || 0,
                    branchId: activeBranch.id,
                };
                
                const parsed = distributionSchema.strip().safeParse(distData);
                if (parsed.success) {
                    newDistributions.push({
                      ...parsed.data,
                      date: parsed.data.date.toISOString(),
                      branchId: activeBranch.id,
                    });
                } else {
                    console.warn('Invalid item skipped:', item, parsed.error);
                }
            }

            if (newDistributions.length > 0) {
                const addedDists = await addMultipleKioskDistributions(newDistributions);
                setDistributions(prev => [...prev, ...addedDists]);
                toast({
                    title: 'Sukses',
                    description: `${addedDists.length} penyaluran berhasil diimpor.`,
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
        <h1 className="font-headline text-lg font-semibold md:text-2xl">Penyaluran Kios</h1>
        <div className="ml-auto flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari..."
              className="w-full rounded-lg bg-background md:w-[200px] lg:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
             <Select onValueChange={(key) => setGroupFilter({ key: key as 'kioskId' | 'doNumber' | 'none', value: 'all' })} value={groupFilter.key}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Kelompokkan Data" />
                </SelectTrigger>
                <SelectContent>
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
          {selectedDists.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus ({selectedDists.length})
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleDialogOpen(null)}><PlusCircle className="mr-2 h-4 w-4" />Tambah Penyaluran</Button>
          )}
        </div>
      </div>
       <div className="grid gap-4 sm:grid-cols-2">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total QTY Penyaluran</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summaryData.totalQty.toLocaleString('id-ID')}</div>
                   <p className="text-xs text-muted-foreground">Jumlah semua kuantitas yang disalurkan</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tagihan Belum Lunas</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalOutstanding)}</div>
                   <p className="text-xs text-muted-foreground">Jumlah semua tagihan yang belum lunas</p>
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
                    checked={sortedAndFilteredDistributions.length > 0 && selectedDists.length === sortedAndFilteredDistributions.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('doNumber')}>NO DO<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('date')}>Tanggal<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                {user?.role === 'owner' && <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('branchName')}>Kabupaten<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>}
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('productName')}>Nama Produk<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('kioskName')}>Nama Kios<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('namaSopir')}>Nama Sopir<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-center px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('quantity')}>QTY<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('total')}>Total<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('directPayment')}>Dibayar Langsung<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('paymentTempo')}>Pembayaran Tempo<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('kurangBayar')}>Kurang Bayar<ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2">Keterangan</TableHead>
                <TableHead className="w-[40px] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredDistributions.map((dist) => {
                const { product } = getDetails(dist.doNumber);
                const total = product ? dist.quantity * product.sellPrice : 0;
                const totalTempo = payments.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0);
                const kurangBayar = total - dist.directPayment - totalTempo;
                const isUnpaid = kurangBayar > 0;

                return (
                  <TableRow 
                    key={dist.id} 
                    data-state={selectedDists.includes(dist.id) && "selected"}
                    className={cn({ 'bg-destructive/10 hover:bg-destructive/20 data-[state=selected]:bg-destructive/20': isUnpaid })}
                  >
                    <TableCell className="px-2">
                      <Checkbox
                        checked={selectedDists.includes(dist.id)}
                        onCheckedChange={(checked) => handleSelectDist(dist.id, !!checked)}
                        aria-label={`Pilih ${dist.doNumber}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium px-2">{dist.doNumber}</TableCell>
                    <TableCell className="px-2">{format(new Date(dist.date), 'dd/MM/yyyy')}</TableCell>
                    {user?.role === 'owner' && <TableCell className="px-2">{getBranchName(dist.branchId)}</TableCell>}
                    <TableCell className="px-2">{product?.name || 'N/A'}</TableCell>
                    <TableCell className="px-2">{getKioskName(dist.kioskId)}</TableCell>
                    <TableCell className="px-2">{dist.namaSopir}</TableCell>
                    <TableCell className="text-center px-2">{dist.quantity.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right px-2">{formatCurrency(total)}</TableCell>
                    <TableCell className="text-right px-2">{formatCurrency(dist.directPayment)}</TableCell>
                    <TableCell className="text-right px-2">{formatCurrency(totalTempo)}</TableCell>
                    <TableCell className={cn("text-right px-2", { "text-destructive font-semibold": isUnpaid })}>{formatCurrency(kurangBayar)}</TableCell>
                    <TableCell className={cn("px-2", { "text-destructive font-semibold": isUnpaid })}>
                        {isUnpaid ? 'Belum Lunas' : 'Lunas'}
                    </TableCell>
                    <TableCell className="px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-6 w-6 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDialogOpen(dist)}><Edit className="mr-2 h-4 w-4" />Ubah</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(dist.id)}><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownMenuItem>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="font-headline">{editingDist ? 'Ubah' : 'Tambah'} Penyaluran</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
               <FormField name="doNumber" control={form.control} render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>NO DO</FormLabel>
                   <Combobox
                      options={doOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih NO DO"
                      searchPlaceholder="Cari NO DO..."
                      emptyPlaceholder="NO DO tidak ditemukan."
                    />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="col-span-2">
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
                name="kioskId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nama Kios</FormLabel>
                    <Combobox
                      options={kioskOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih Kios"
                      searchPlaceholder="Cari Kios..."
                      emptyPlaceholder="Kios tidak ditemukan."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField name="namaSopir" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Nama Sopir</FormLabel><FormControl><Input placeholder="cth. Budi" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="jamAngkut" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Jam Angkut (24H)</FormLabel><FormControl><Input placeholder="cth. 14:30" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="quantity" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>QTY</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField name="directPayment" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>Dibayar Langsung</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="col-span-2">
                <DialogClose asChild><Button type="button" variant="secondary">Batal</Button></DialogClose>
                <Button type="submit">{editingDist ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
