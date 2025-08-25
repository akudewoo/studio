
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Download, Search, ArrowUpDown, ChevronDown } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import type { Kiosk, KioskDistribution, Payment, Product, Redemption, KioskInput } from '@/lib/types';
import { getKiosks, addKiosk, updateKiosk, deleteKiosk, deleteMultipleKiosks, addMultipleKiosks } from '@/services/kioskService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getPayments } from '@/services/paymentService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { cn } from '@/lib/utils';
import { exportToPdf } from '@/lib/pdf-export';
import { useBranch } from '@/hooks/use-branch';


const kioskSchema = z.object({
  name: z.string().min(1, { message: 'Nama kios harus diisi' }),
  address: z.string().min(1, { message: 'Alamat harus diisi' }),
  phone: z.string().min(1, { message: 'No. Telepon harus diisi' }),
  desa: z.string().min(1, { message: 'Desa harus diisi' }),
  kecamatan: z.string().min(1, { message: 'Kecamatan harus diisi' }),
  penanggungJawab: z.string().min(1, { message: 'Penanggung Jawab harus diisi' }),
});

type SortConfig = {
  key: keyof Kiosk | 'totalBills';
  direction: 'ascending' | 'descending';
} | null;

export default function KiosPage() {
  const { activeBranch, loading: branchLoading } = useBranch();
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKiosk, setEditingKiosk] = useState<Kiosk | null>(null);
  const [selectedKiosks, setSelectedKiosks] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<{key: keyof Kiosk | 'none', value: string}>({key: 'none', value: 'all'});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!activeBranch) return;
      try {
        setKiosks(await getKiosks(activeBranch.id));
        setDistributions(await getKioskDistributions(activeBranch.id));
        setPayments(await getPayments(activeBranch.id));
        setProducts(await getProducts(activeBranch.id));
        setRedemptions(await getRedemptions(activeBranch.id));
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
  }, [activeBranch, toast]);
  
  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    const formattedValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(value));
    return isNegative ? `(${formattedValue})` : formattedValue;
  };

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
  
  const sortedAndFilteredKiosks = useMemo(() => {
    let filterableKiosks = [...kiosks];

    if (searchQuery) {
        filterableKiosks = filterableKiosks.filter(kiosk =>
            Object.values(kiosk).some(value => 
                String(value).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }
    
    if (groupFilter.key !== 'none' && groupFilter.value !== 'all') {
        filterableKiosks = filterableKiosks.filter(k => k[groupFilter.key] === groupFilter.value);
    }
    
    if (sortConfig !== null) {
      filterableKiosks.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.key === 'totalBills') {
          aValue = totalBills[a.id] || 0;
          bValue = totalBills[b.id] || 0;
        } else {
          aValue = a[sortConfig.key as keyof Kiosk];
          bValue = b[sortConfig.key as keyof Kiosk];
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

    return filterableKiosks;
  }, [kiosks, searchQuery, groupFilter, sortConfig, totalBills]);

  const requestSort = (key: keyof Kiosk | 'totalBills') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const groupingOptions: {key: keyof Kiosk | 'none', label: string}[] = [
    { key: 'none', label: 'Tidak Dikelompokkan' },
    { key: 'kecamatan', label: 'Kecamatan' },
    { key: 'desa', label: 'Desa' },
  ];

  const uniqueGroupValues = useMemo(() => {
    if (groupFilter.key === 'none') return [];
    return [...new Set(kiosks.map(k => k[groupFilter.key]))];
  }, [kiosks, groupFilter.key]);

  const summaryData = useMemo(() => {
    return sortedAndFilteredKiosks.reduce((acc, kiosk) => {
        acc.totalKiosks += 1;
        acc.totalBill += totalBills[kiosk.id] || 0;
        return acc;
    }, { totalKiosks: 0, totalBill: 0 });
  }, [sortedAndFilteredKiosks, totalBills]);


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
    if (!activeBranch) return;
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
        const newKiosk = await addKiosk({ ...values, branchId: activeBranch.id });
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
      setSelectedKiosks(sortedAndFilteredKiosks.map(k => k.id));
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
  
  const handleExportExcel = () => {
    const dataToExport = sortedAndFilteredKiosks.map(k => ({
        'Nama Kios': k.name,
        'Penanggung Jawab': k.penanggungJawab,
        'Alamat': k.address,
        'Desa': k.desa,
        'Kecamatan': k.kecamatan,
        'No. Telepon': k.phone,
        'Tagihan Total': totalBills[k.id] || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kios");
    XLSX.writeFile(workbook, "DataKios.xlsx");
     toast({
        title: 'Sukses',
        description: 'Data kios berhasil diekspor ke Excel.',
      });
  };

  const handleExportPdf = () => {
    const headers = [['Nama Kios', 'Penanggung Jawab', 'Alamat', 'Desa', 'Kecamatan', 'No. Telepon', 'Tagihan Total']];
    const data = sortedAndFilteredKiosks.map(k => [
        k.name,
        k.penanggungJawab,
        k.address,
        k.desa,
        k.kecamatan,
        k.phone,
        formatCurrency(totalBills[k.id] || 0)
    ]);

    exportToPdf('Data Kios', headers, data);
    toast({
      title: 'Sukses',
      description: 'Data kios berhasil diekspor ke PDF.',
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

            const newKiosks: KioskInput[] = [];
            for (const item of json) {
                const kioskData = {
                    name: item['Nama Kios'],
                    address: item['Alamat'],
                    phone: String(item['No. Telepon']),
                    desa: item['Desa'],
                    kecamatan: item['Kecamatan'],
                    penanggungJawab: item['Penanggung Jawab'],
                    branchId: activeBranch.id
                };
                
                const parsed = kioskSchema.strip().safeParse(kioskData);
                if (parsed.success) {
                    newKiosks.push({ ...parsed.data, branchId: activeBranch.id });
                } else {
                    console.warn('Invalid item skipped:', item, parsed.error);
                }
            }

            if (newKiosks.length > 0) {
                const addedKiosks = await addMultipleKiosks(newKiosks);
                setKiosks(prev => [...prev, ...addedKiosks]);
                toast({
                    title: 'Sukses',
                    description: `${addedKiosks.length} kios berhasil diimpor.`,
                });
            } else {
                 toast({
                    title: 'Tidak Ada Data',
                    description: 'Tidak ada data kios yang valid untuk diimpor.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Gagal mengimpor file. Pastikan format file benar.',
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
        <h1 className="font-headline text-lg font-semibold md:text-2xl">
          Data Kios
        </h1>
        <div className="ml-auto flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari Kios..."
              className="w-full rounded-lg bg-background md:w-[200px] lg:w-[250px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select onValueChange={(key) => setGroupFilter({ key: key as keyof Kiosk | 'none', value: 'all' })} value={groupFilter.key}>
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
                      {uniqueGroupValues.map(val => <SelectItem key={val as string} value={val as string}>{val as string}</SelectItem>)}
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
       <div className="grid gap-4 sm:grid-cols-2">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Kios</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summaryData.totalKiosks}</div>
                  <p className="text-xs text-muted-foreground">Jumlah total kios terdaftar</p>
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tagihan</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalBill)}</div>
                  <p className="text-xs text-muted-foreground">Jumlah semua tagihan kios</p>
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
                    checked={sortedAndFilteredKiosks.length > 0 && selectedKiosks.length === sortedAndFilteredKiosks.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('name')}>Nama Kios <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('penanggungJawab')}>Penanggung Jawab <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('address')}>Alamat <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('desa')}>Desa <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('kecamatan')}>Kecamatan <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('phone')}>No. Telepon <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="text-right px-2"><Button className="text-xs px-2" variant="ghost" onClick={() => requestSort('totalBills')}>Tagihan Total <ArrowUpDown className="ml-2 h-3 w-3" /></Button></TableHead>
                <TableHead className="w-[40px] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredKiosks.map((kiosk) => {
                const bill = totalBills[kiosk.id] || 0;
                const hasBill = bill > 0;
                return (
                <TableRow 
                  key={kiosk.id} 
                  data-state={selectedKiosks.includes(kiosk.id) && "selected"}
                  className={cn({ 'bg-destructive/10 hover:bg-destructive/20 text-destructive': hasBill })}
                >
                   <TableCell className="px-2">
                    <Checkbox
                      checked={selectedKiosks.includes(kiosk.id)}
                      onCheckedChange={(checked) => handleSelectKiosk(kiosk.id, !!checked)}
                      aria-label={`Pilih ${kiosk.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium px-2">{kiosk.name}</TableCell>
                  <TableCell className="px-2">{kiosk.penanggungJawab}</TableCell>
                  <TableCell className="px-2">{kiosk.address}</TableCell>
                  <TableCell className="px-2">{kiosk.desa}</TableCell>
                  <TableCell className="px-2">{kiosk.kecamatan}</TableCell>
                  <TableCell className="px-2">{kiosk.phone}</TableCell>
                  <TableCell className={cn("text-right px-2", { "font-semibold": hasBill })}>{formatCurrency(bill)}</TableCell>
                  <TableCell className="px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-6 w-6 p-0">
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
              )})}
            </TableBody>
          </Table>
          </div>
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
