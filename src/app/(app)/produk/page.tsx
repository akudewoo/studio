
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Upload, Download, Search, ArrowUpDown, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Product, Redemption, DORelease, ProductInput } from '@/lib/types';
import { getProducts, addProduct, updateProduct, deleteProduct, deleteMultipleProducts, addMultipleProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { getDOReleases } from '@/services/doReleaseService';
import { exportToPdf } from '@/lib/pdf-export';
import { useBranch } from '@/hooks/use-branch';


const productSchema = z.object({
  name: z.string().min(1, { message: 'Nama produk harus diisi' }),
  purchasePrice: z.coerce.number().min(0, { message: 'Harga beli harus positif' }),
  sellPrice: z.coerce.number().min(0, { message: 'Harga jual harus positif' }),
});

type SortConfig = {
  key: keyof Product | 'stock';
  direction: 'ascending' | 'descending';
} | null;

export default function ProdukPage() {
  const { activeBranch, loading: branchLoading } = useBranch();
  const [products, setProducts] = useState<Product[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [doReleases, setDoReleases] = useState<DORelease[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!activeBranch) return;
      try {
        setProducts(await getProducts(activeBranch.id));
        setRedemptions(await getRedemptions(activeBranch.id));
        setDoReleases(await getDOReleases(activeBranch.id));
      } catch (error) {
        console.error("Firebase Error: ", error);
        toast({
          title: 'Gagal Memuat Data',
          description: 'Pastikan konfigurasi Firebase Anda sudah benar dan layanan Firestore telah diaktifkan.',
          variant: 'destructive',
        });
      }
    }
    loadData();
  }, [activeBranch, toast]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const stockByProduct = useMemo(() => {
    const stock: Record<string, number> = {};
    products.forEach(p => {
        stock[p.id] = 0;
    });

    const redeemedQtyByProduct: Record<string, number> = {};
    redemptions.forEach(redemption => {
        redeemedQtyByProduct[redemption.productId] = (redeemedQtyByProduct[redemption.productId] || 0) + redemption.quantity;
    });
    
    const releasedQtyByProduct: Record<string, number> = {};
    const redemptionProductMap = redemptions.reduce((map, r) => {
        map[r.doNumber] = r.productId;
        return map;
    }, {} as Record<string, string>);

    doReleases.forEach(release => {
        const productId = redemptionProductMap[release.doNumber];
        if (productId) {
            releasedQtyByProduct[productId] = (releasedQtyByProduct[productId] || 0) + release.quantity;
        }
    });

    products.forEach(p => {
        const totalRedeemed = redeemedQtyByProduct[p.id] || 0;
        const totalReleased = releasedQtyByProduct[p.id] || 0;
        stock[p.id] = totalRedeemed - totalReleased;
    });
    
    return stock;
}, [products, redemptions, doReleases]);
  
  const sortedAndFilteredProducts = useMemo(() => {
    let sortableProducts = [...products];

    if (searchQuery) {
        sortableProducts = sortableProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (sortConfig !== null) {
      sortableProducts.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        if (sortConfig.key === 'stock') {
          aValue = stockByProduct[a.id] || 0;
          bValue = stockByProduct[b.id] || 0;
        } else {
          aValue = a[sortConfig.key as keyof Product];
          bValue = b[sortConfig.key as keyof Product];
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

    return sortableProducts;
  }, [products, searchQuery, sortConfig, stockByProduct]);

  const requestSort = (key: keyof Product | 'stock') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const summaryData = useMemo(() => {
    return sortedAndFilteredProducts.reduce((acc, product) => {
        const stock = stockByProduct[product.id] || 0;
        acc.totalStock += stock;
        acc.totalPurchaseValue += stock * product.purchasePrice;
        acc.totalSellValue += stock * product.sellPrice;
        return acc;
    }, { totalStock: 0, totalPurchaseValue: 0, totalSellValue: 0 });
  }, [sortedAndFilteredProducts, stockByProduct]);


  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      purchasePrice: 0,
      sellPrice: 0,
    },
  });

  const handleDialogOpen = (product: Product | null) => {
    setEditingProduct(product);
    if (product) {
      form.reset({
        name: product.name,
        purchasePrice: product.purchasePrice,
        sellPrice: product.sellPrice,
      });
    } else {
      form.reset({ name: '', purchasePrice: 0, sellPrice: 0 });
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const originalProducts = [...products];
    setProducts(products.filter((p) => p.id !== id));
    try {
      await deleteProduct(id);
      toast({
        title: 'Sukses',
        description: 'Produk berhasil dihapus.',
      });
    } catch (error) {
      setProducts(originalProducts);
      toast({
        title: 'Error',
        description: 'Gagal menghapus produk.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof productSchema>) => {
    if (!activeBranch) return;

    if (editingProduct) {
      const originalProducts = [...products];
      const updatedProduct = { ...editingProduct, ...values };
      setProducts(products.map((p) => (p.id === editingProduct.id ? updatedProduct : p)));
      
      try {
        await updateProduct(editingProduct.id, values);
        toast({
          title: 'Sukses',
          description: 'Produk berhasil diperbarui.',
        });
      } catch (error) {
        setProducts(originalProducts);
        toast({
          title: 'Error',
          description: 'Gagal memperbarui produk.',
          variant: 'destructive',
        });
      } finally {
        setEditingProduct(null);
      }
    } else {
      const optimisticProduct: ProductInput = { ...values, branchId: activeBranch.id };
      try {
        const newProduct = await addProduct(optimisticProduct);
        setProducts(prevProducts => [...prevProducts, newProduct]);
        toast({
          title: 'Sukses',
          description: 'Produk baru berhasil ditambahkan.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Gagal menyimpan produk.',
          variant: 'destructive',
        });
      }
    }
    setIsDialogOpen(false);
  };
  

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(sortedAndFilteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, id]);
    } else {
      setSelectedProducts(selectedProducts.filter(pid => pid !== id));
    }
  };
  
  const handleDeleteSelected = async () => {
    const originalProducts = [...products];
    const productsToDelete = selectedProducts;

    setProducts(products.filter(p => !productsToDelete.includes(p.id)));
    setSelectedProducts([]);

    try {
      await deleteMultipleProducts(productsToDelete);
      toast({
        title: 'Sukses',
        description: `${productsToDelete.length} produk berhasil dihapus.`,
      });
    } catch (error) {
      setProducts(originalProducts);
      toast({
        title: 'Error',
        description: 'Gagal menghapus produk terpilih.',
        variant: 'destructive',
      });
    }
  };
  
  const handleExportExcel = () => {
    const dataToExport = sortedAndFilteredProducts.map(p => ({
        'Nama Produk': p.name,
        'Harga Beli': p.purchasePrice,
        'Harga Jual': p.sellPrice,
        'Stok': stockByProduct[p.id] || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Produk");
    XLSX.writeFile(workbook, "DataProduk.xlsx");
     toast({
        title: 'Sukses',
        description: 'Data produk berhasil diekspor ke Excel.',
      });
  };

  const handleExportPdf = () => {
    const headers = [['Nama Produk', 'Harga Beli', 'Harga Jual', 'Stok']];
    const data = sortedAndFilteredProducts.map(p => [
      p.name,
      formatCurrency(p.purchasePrice),
      formatCurrency(p.sellPrice),
      (stockByProduct[p.id] || 0).toLocaleString('id-ID')
    ]);
    exportToPdf('Data Produk', headers, data);
    toast({
      title: 'Sukses',
      description: 'Data produk berhasil diekspor ke PDF.',
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!fileInputRef.current?.files || !activeBranch) return;
    const file = fileInputRef.current.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            const newProducts: ProductInput[] = [];
            for (const item of json) {
                const productData = {
                    name: item['Nama Produk'],
                    purchasePrice: item['Harga Beli'],
                    sellPrice: item['Harga Jual'],
                    branchId: activeBranch.id,
                };
                
                const parsed = productSchema.strip().safeParse(productData);
                if (parsed.success) {
                    newProducts.push({ ...parsed.data, branchId: activeBranch.id });
                } else {
                    console.warn('Invalid item skipped:', item, parsed.error);
                }
            }

            if (newProducts.length > 0) {
                const addedProducts = await addMultipleProducts(newProducts);
                setProducts(prev => [...prev, ...addedProducts]);
                toast({
                    title: 'Sukses',
                    description: `${addedProducts.length} produk berhasil diimpor.`,
                });
            } else {
                 toast({
                    title: 'Tidak Ada Data',
                    description: 'Tidak ada data produk yang valid untuk diimpor.',
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
          Daftar Produk
        </h1>
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

          {selectedProducts.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus ({selectedProducts.length})
            </Button>
          ) : (
            <Button size="sm" onClick={() => handleDialogOpen(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Tambah Produk
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalStock.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Jumlah semua stok produk</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Aset (Beli)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryData.totalPurchaseValue)}</div>
             <p className="text-xs text-muted-foreground">Total nilai stok berdasarkan harga beli</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Aset (Jual)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryData.totalSellValue)}</div>
            <p className="text-xs text-muted-foreground">Total nilai stok berdasarkan harga jual</p>
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
                    checked={sortedAndFilteredProducts.length > 0 && selectedProducts.length === sortedAndFilteredProducts.length}
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    aria-label="Pilih semua"
                  />
                </TableHead>
                <TableHead className="px-2">
                  <Button variant="ghost" onClick={() => requestSort('name')} className="text-xs px-2">
                    Nama Produk
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right px-2">
                  <Button variant="ghost" onClick={() => requestSort('purchasePrice')} className="text-xs px-2">
                    Harga Beli
                     <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right px-2">
                  <Button variant="ghost" onClick={() => requestSort('sellPrice')} className="text-xs px-2">
                    Harga Jual
                     <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-center px-2">
                  <Button variant="ghost" onClick={() => requestSort('stock')} className="text-xs px-2">
                    Stok
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="w-[40px] px-2"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredProducts.map((product) => (
                <TableRow key={product.id} data-state={selectedProducts.includes(product.id) && "selected"}>
                  <TableCell className="px-2">
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                      aria-label={`Pilih ${product.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium px-2">{product.name}</TableCell>
                  <TableCell className="text-right px-2">
                    {formatCurrency(product.purchasePrice)}
                  </TableCell>
                  <TableCell className="text-right px-2">
                    {formatCurrency(product.sellPrice)}
                  </TableCell>
                  <TableCell className="text-center px-2">
                    {(stockByProduct[product.id] || 0).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-6 w-6 p-0">
                          <span className="sr-only">Buka menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDialogOpen(product)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Ubah
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(product.id)}
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setEditingProduct(null);
          form.reset({ name: '', purchasePrice: 0, sellPrice: 0 });
        }
        setIsDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">
              {editingProduct ? 'Ubah Produk' : 'Tambah Produk'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Ubah detail produk di bawah ini.'
                : 'Isi detail untuk produk baru.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Produk</FormLabel>
                    <FormControl>
                      <Input placeholder="cth. Pupuk Urea" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Beli</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="cth. 2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sellPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Harga Jual</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="cth. 2500" {...field} />
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
                <Button type="submit">{editingProduct ? 'Simpan' : 'Tambah'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
