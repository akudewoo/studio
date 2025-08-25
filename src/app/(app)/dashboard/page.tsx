
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Package, Store, CircleDollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { getDOReleases } from '@/services/doReleaseService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getPayments } from '@/services/paymentService';

import type { Kiosk, Product, Redemption, DORelease, KioskDistribution, Payment } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [data, setData] = useState<{
    kiosks: Kiosk[];
    products: Product[];
    redemptions: Redemption[];
    doReleases: DORelease[];
    distributions: KioskDistribution[];
    payments: Payment[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [kiosks, products, redemptions, doReleases, distributions, payments] = await Promise.all([
          getKiosks(),
          getProducts(),
          getRedemptions(),
          getDOReleases(),
          getKioskDistributions(),
          getPayments(),
        ]);
        setData({ kiosks, products, redemptions, doReleases, distributions, payments });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    const formattedValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(value));
    return isNegative ? `(${formattedValue})` : formattedValue;
  };
  
  const formatCurrencyShort = (value: number) => {
    if (value >= 1_000_000_000) {
      return (value / 1_000_000_000).toFixed(1) + ' M';
    }
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1) + ' Jt';
    }
    if (value >= 1_000) {
      return (value / 1_000).toFixed(1) + ' Rb';
    }
    return value.toString();
  };

  const dashboardMetrics = useMemo(() => {
    if (!data) return {
      totalKiosks: 0,
      totalStock: 0,
      totalOutstanding: 0,
      totalAssetValue: 0,
      stockByProduct: [],
      topOutstandingKiosks: [],
      monthlySales: [],
    };

    const { kiosks, products, redemptions, doReleases, distributions, payments } = data;

    // Total Kiosks
    const totalKiosks = kiosks.length;
    
    // Stock Calculations
    const stock: Record<string, number> = {};
    products.forEach(p => { stock[p.id] = 0; });
    const redeemedQtyByProduct: Record<string, number> = {};
    redemptions.forEach(r => { redeemedQtyByProduct[r.productId] = (redeemedQtyByProduct[r.productId] || 0) + r.quantity; });
    
    const redemptionProductMap = redemptions.reduce((map, r) => { map[r.doNumber] = r.productId; return map; }, {} as Record<string, string>);
    const releasedQtyByProduct: Record<string, number> = {};
    doReleases.forEach(release => {
      const productId = redemptionProductMap[release.doNumber];
      if (productId) {
        releasedQtyByProduct[productId] = (releasedQtyByProduct[productId] || 0) + release.quantity;
      }
    });

    products.forEach(p => {
      stock[p.id] = (redeemedQtyByProduct[p.id] || 0) - (releasedQtyByProduct[p.id] || 0);
    });
    const totalStock = Object.values(stock).reduce((sum, s) => sum + s, 0);
    const totalAssetValue = products.reduce((sum, p) => sum + (stock[p.id] || 0) * p.sellPrice, 0);
    
    const stockByProduct = products.map(p => ({
      name: p.name,
      stock: stock[p.id] || 0,
      fill: `hsl(var(--chart-1))`,
    })).sort((a,b) => b.stock - a.stock);

    // Outstanding Bills & Sales
    const kioskBills: Record<string, number> = {};
    kiosks.forEach(k => { kioskBills[k.id] = 0; });
    const salesByMonth: Record<string, number> = {};

    distributions.forEach(dist => {
      const redemption = redemptions.find(r => r.doNumber === dist.doNumber);
      const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
      if (product) {
        const totalValue = dist.quantity * product.sellPrice;
        const totalPaid = dist.directPayment + payments.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0);
        const outstanding = totalValue - totalPaid;
        kioskBills[dist.kioskId] = (kioskBills[dist.kioskId] || 0) + outstanding;

        // Sales calculation
        const monthKey = format(parseISO(dist.date), 'yyyy-MM');
        salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + totalValue;
      }
    });

    const totalOutstanding = Object.values(kioskBills).reduce((sum, bill) => sum + bill, 0);

    const topOutstandingKiosks = Object.entries(kioskBills)
        .map(([kioskId, amount]) => ({
            kioskId,
            name: kiosks.find(k => k.id === kioskId)?.name || 'N/A',
            amount,
        }))
        .filter(k => k.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    const monthlySales = Object.entries(salesByMonth)
      .map(([monthKey, total]) => ({
        name: format(parseISO(monthKey + '-01'), 'MMM yy', { locale: id }),
        total: total,
        fill: `hsl(var(--chart-2))`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));


    return { totalKiosks, totalStock, totalOutstanding, totalAssetValue, stockByProduct, topOutstandingKiosks, monthlySales };
  }, [data]);
  
  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <h1 className="font-headline text-lg font-semibold md:text-2xl">Dasbor</h1>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
              <Skeleton className="h-80 lg:col-span-1" />
          </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <h1 className="font-headline text-lg font-semibold md:text-2xl">Dasbor</h1>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kios</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalKiosks}</div>
            <p className="text-xs text-muted-foreground">Kios terdaftar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok Gudang</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardMetrics.totalStock.toLocaleString('id-ID')} Ton</div>
            <p className="text-xs text-muted-foreground">Total semua stok produk</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tagihan Belum Lunas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Dari semua kios</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Aset Gudang</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalAssetValue)}</div>
            <p className="text-xs text-muted-foreground">Berdasarkan harga jual</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Penjualan Bulanan</CardTitle>
            <CardDescription>Total nilai penjualan dari penyaluran kios per bulan.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardMetrics.monthlySales} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatCurrencyShort(value as number)} />
                        <Tooltip 
                          cursor={{fill: 'hsl(var(--muted))'}}
                          content={<ChartTooltipContent indicator="dot" formatter={(value) => formatCurrency(value as number)} />}
                        />
                        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                           <LabelList dataKey="total" position="top" offset={8} className="fill-foreground text-xs" formatter={(value: number) => formatCurrencyShort(value)} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kios Dengan Tagihan Teratas</CardTitle>
            <CardDescription>Top 5 kios dengan total tagihan belum lunas tertinggi.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kios</TableHead>
                  <TableHead className="text-right">Total Tagihan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardMetrics.topOutstandingKiosks.length > 0 ? dashboardMetrics.topOutstandingKiosks.map((kiosk) => (
                  <TableRow key={kiosk.kioskId}>
                    <TableCell className="font-medium">{kiosk.name}</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">{formatCurrency(kiosk.amount)}</TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center">
                            Tidak ada tagihan yang belum lunas.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>Stok Produk di Gudang</CardTitle>
            <CardDescription>Jumlah stok tersedia untuk setiap produk (dalam Ton).</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardMetrics.stockByProduct} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-25} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        cursor={{fill: 'hsl(var(--muted))'}}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                         <LabelList dataKey="stock" position="top" offset={8} className="fill-foreground text-xs" formatter={(value: number) => value.toLocaleString('id-ID')} />
                      </Bar>
                  </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
    </div>
  );
}

    