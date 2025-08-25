
'use client';

import { useState, useEffect, useRef } from 'react';
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, subDays, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';


import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getRedemptions } from '@/services/redemptionService';
import { getDOReleases } from '@/services/doReleaseService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import { getPayments } from '@/services/paymentService';
import type { Redemption, DORelease, KioskDistribution, Kiosk, Product, Payment } from '@/lib/types';
import { Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type ReportType = 'harian' | 'mingguan' | 'bulanan';

const tableStyles = `
<style>
  body { font-family: 'sans-serif'; color: #333; }
  .report-container { width: 100%; }
  .report-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1rem;
    font-size: 10px;
  }
  .report-table th, .report-table td {
    border: 1px solid #cbd5e1;
    padding: 6px;
    text-align: left;
  }
  .report-table th {
    background-color: #f1f5f9;
    font-weight: 600;
  }
  .report-table tfoot td, .report-table tfoot th {
    font-weight: 600;
    background-color: #f1f5f9;
  }
  .text-right { text-align: right !important; }
  .text-center { text-align: center !important; }
  .font-bold { font-weight: 700; }
  .mt-4 { margin-top: 1.5rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
  h4 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
  .no-border-bottom { border-bottom: none !important; }
  .summary-table { width: 50%; font-size: 10px; border-collapse: collapse; }
  .summary-table td { border: 1px solid #cbd5e1; padding: 6px; }
  .summary-table td:first-child { font-weight: 600; width: 40%; }
  .summary-table td:last-child { text-align: right; }
</style>
`;

export default function LaporanPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedWeek, setSelectedWeek] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();
  
  const [summary, setSummary] = useState('');
  const [summaryTitle, setSummaryTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [doReleases, setDoReleases] = useState<DORelease[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setMounted(true);
    const today = new Date();
    setSelectedDate(today);
    setSelectedWeek(today);
    setSelectedMonth(today);

    async function loadData() {
      try {
        setIsLoading(true);
        const [redemptionsData, doReleasesData, distributionsData, kiosksData, productsData, paymentsData] = await Promise.all([
          getRedemptions(),
          getDOReleases(),
          getKioskDistributions(),
          getKiosks(),
          getProducts(),
          getPayments(),
        ]);
        setRedemptions(redemptionsData);
        setDoReleases(doReleasesData);
        setDistributions(distributionsData);
        setKiosks(kiosksData);
        setProducts(productsData);
        setPayments(paymentsData);
      } catch (error) {
        toast({
          title: 'Gagal memuat data',
          description: 'Terjadi kesalahan saat memuat data dari database.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);
  
  const formatCurrency = (value: number) => {
    const isNegative = value < 0;
    const formattedValue = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Math.abs(value));
    return isNegative ? `(${formattedValue})` : formattedValue;
  };

  const generateDailyRecap = (dateForReport: Date) => {
      const title = `Rekapitulasi Harian - ${format(dateForReport, 'd MMMM yyyy', { locale: id })}`;
      let generatedSummary = `
        ${tableStyles}
        <div class="report-container">
            <h3 class="text-center">${title}</h3>
      `;

      // --- Maps for easy lookup ---
      const redemptionProductMap = redemptions.reduce((map, r) => { map[r.doNumber] = r.productId; return map }, {} as Record<string, string>);

      // --- Calculations ---
      const yesterday = subDays(dateForReport, 1);
      
      const stockReconciliationData = products.map(product => {
          const redemptionsBeforeToday = redemptions.filter(r => r.productId === product.id && parseISO(r.date) <= yesterday);
          const doReleasesBeforeToday = doReleases.filter(dr => redemptionProductMap[dr.doNumber] === product.id && parseISO(dr.date) <= yesterday);
          const sisaLalu = redemptionsBeforeToday.reduce((sum, r) => sum + r.quantity, 0) - doReleasesBeforeToday.reduce((sum, dr) => sum + dr.quantity, 0);

          const penebusanHariIni = redemptions.filter(r => r.productId === product.id && isSameDay(parseISO(r.date), dateForReport)).reduce((sum, r) => sum + r.quantity, 0);
          const penyaluranHariIni = distributions.filter(d => redemptionProductMap[d.doNumber] === product.id && isSameDay(parseISO(d.date), dateForReport)).reduce((sum, d) => sum + d.quantity, 0);
          
          const stokAkhir = sisaLalu + penebusanHariIni - penyaluranHariIni;
          const jualKeKios = penyaluranHariIni * product.sellPrice;

          return {
              name: product.name,
              sisaLalu,
              penyaluran: penyaluranHariIni,
              penebusan: penebusanHariIni,
              stokAkhir,
              hargaJual: product.sellPrice,
              jualKeKios,
              hargaBeli: product.purchasePrice,
          };
      });

      // --- Main Table ---
      generatedSummary += `<table class="report-table">
          <thead>
              <tr>
                  <th>PRODUK</th>
                  <th class="text-right">SISA LALU</th>
                  <th class="text-right">PENYALURAN</th>
                  <th class="text-right">PENEBUSAN</th>
                  <th class="text-right">STOK AKHIR</th>
                  <th class="text-right">HARGA JUAL</th>
                  <th class="text-right">JUAL KE KIOS</th>
              </tr>
          </thead>
          <tbody>
      `;
      stockReconciliationData.forEach(data => {
          generatedSummary += `
              <tr>
                  <td>${data.name}</td>
                  <td class="text-right">${data.sisaLalu.toLocaleString('id-ID')}</td>
                  <td class="text-right">${data.penyaluran.toLocaleString('id-ID')}</td>
                  <td class="text-right">${data.penebusan.toLocaleString('id-ID')}</td>
                  <td class="text-right">${data.stokAkhir.toLocaleString('id-ID')}</td>
                  <td class="text-right">${formatCurrency(data.hargaJual)}</td>
                  <td class="text-right">${formatCurrency(data.jualKeKios)}</td>
              </tr>
          `;
      });
       generatedSummary += `</tbody></table>`;
       
      // --- Financial Summary ---
      const totalDistributionsBeforeToday = distributions.filter(d => parseISO(d.date) <= yesterday);
      const totalPaymentsBeforeToday = payments.filter(p => parseISO(p.date) <= yesterday);

      let sisaTagihanLalu = 0;
      totalDistributionsBeforeToday.forEach(dist => {
          const redemption = redemptions.find(r => r.doNumber === dist.doNumber);
          const product = redemption ? products.find(p => p.id === redemption.productId) : undefined;
          if (product) {
              const totalValue = dist.quantity * product.sellPrice;
              const totalPaidForThisDist = totalPaymentsBeforeToday.filter(p => p.doNumber === dist.doNumber && p.kioskId === dist.kioskId).reduce((sum, p) => sum + p.amount, 0) + dist.directPayment;
              sisaTagihanLalu += totalValue - totalPaidForThisDist;
          }
      });
      
      const penjualanHariIni = stockReconciliationData.reduce((sum, data) => sum + data.jualKeKios, 0);
      const pembayaranHariIni = payments.filter(p => isSameDay(parseISO(p.date), dateForReport)).reduce((sum, p) => sum + p.amount, 0)
          + distributions.filter(d => isSameDay(parseISO(d.date), dateForReport)).reduce((sum, d) => sum + d.directPayment, 0);

      const totalTagihan = sisaTagihanLalu + penjualanHariIni;
      const sisaTagihanHariIni = totalTagihan - pembayaranHariIni;
      const sisaPupukValue = stockReconciliationData.reduce((sum, data) => sum + (data.stokAkhir * data.hargaBeli), 0);
      const totalAsset = sisaTagihanHariIni + sisaPupukValue;


      generatedSummary += `<div class="mt-4">
        <table class="summary-table">
          <tbody>
            <tr><td>SISA TAGIHAN LALU</td><td>${formatCurrency(sisaTagihanLalu)}</td></tr>
            <tr><td>PENJUALAN</td><td>${formatCurrency(penjualanHariIni)}</td></tr>
            <tr><td class="font-bold">TOTAL</td><td class="text-right font-bold">${formatCurrency(totalTagihan)}</td></tr>
            <tr><td>PEMBAYARAN</td><td>${formatCurrency(pembayaranHariIni)}</td></tr>
            <tr><td class="font-bold">SISA TAGIHAN HARI INI</td><td class="font-bold">${formatCurrency(sisaTagihanHariIni)}</td></tr>
            <tr><td>SISA PUPUK</td><td>${formatCurrency(sisaPupukValue)}</td></tr>
            <tr><td class="font-bold">TOTAL TAGIHAN & PUPUK</td><td class="font-bold">${formatCurrency(totalAsset)}</td></tr>
          </tbody>
        </table>
      </div>`;


      generatedSummary += `</div>`;
      setSummaryTitle(title);
      setSummary(generatedSummary);
  }

  const generateSummary = async (reportType: ReportType) => {
    let dateFilter: (date: Date) => boolean;
    let title: string;
    let dateForReport: Date | undefined;

    switch (reportType) {
      case 'harian':
        if (!selectedDate) {
          toast({ title: 'Tanggal belum dipilih', variant: 'destructive' });
          return;
        }
        setIsLoading(true);
        generateDailyRecap(selectedDate);
        setIsLoading(false);
        return;
      case 'mingguan':
        if (!selectedWeek) {
          toast({ title: 'Minggu belum dipilih', variant: 'destructive' });
          return;
        }
        dateForReport = selectedWeek;
        const weekStart = startOfWeek(dateForReport, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(dateForReport, { weekStartsOn: 1 });
        title = `Laporan Mingguan - ${format(weekStart, 'd MMM')} s/d ${format(weekEnd, 'd MMM yyyy', { locale: id })}`;
        dateFilter = (date) => isWithinInterval(date, { start: weekStart, end: weekEnd });
        break;
      case 'bulanan':
        if (!selectedMonth) {
          toast({ title: 'Bulan belum dipilih', variant: 'destructive' });
          return;
        }
        dateForReport = selectedMonth;
        const monthStart = startOfMonth(dateForReport);
        const monthEnd = endOfMonth(dateForReport);
        title = `Laporan Bulanan - ${format(dateForReport, 'MMMM yyyy', { locale: id })}`;
        dateFilter = (date) => isWithinInterval(date, { start: monthStart, end: monthEnd });
        break;
      default:
        return;
    }

    setIsLoading(true);
    setSummary('');
    setSummaryTitle(title);

    try {
      const kioskMap = kiosks.reduce((map, k) => { map[k.id] = k.name; return map }, {} as Record<string, string>);
      const productMap = products.reduce((map, p) => { map[p.id] = p.name; return map }, {} as Record<string, string>);
      const redemptionProductMap = redemptions.reduce((map, r) => { map[r.doNumber] = r.productId; return map }, {} as Record<string, string>);

      const dailyRedemptions = redemptions.filter(r => dateFilter(new Date(r.date)));
      const dailyDoReleases = doReleases.filter(dr => dateFilter(new Date(dr.date)));
      const dailyDistributions = distributions.filter(d => dateFilter(new Date(d.date)));

      let generatedSummary = tableStyles;

      // Penebusan
      let totalRedemption = 0;
      const redemptionByProduct: Record<string, number> = {};
      dailyRedemptions.forEach(r => {
        totalRedemption += r.quantity;
        const productName = productMap[r.productId] || 'Produk tidak diketahui';
        redemptionByProduct[productName] = (redemptionByProduct[productName] || 0) + r.quantity;
      });
      generatedSummary += `<div><h4>Penebusan</h4>`;
      if (Object.keys(redemptionByProduct).length > 0) {
        generatedSummary += `<table class="report-table"><thead><tr><th>Nama Produk</th><th class="text-right">QTY (Ton)</th></tr></thead><tbody>`;
        for (const productName in redemptionByProduct) {
          generatedSummary += `<tr><td>${productName}</td><td class="text-right">${redemptionByProduct[productName].toLocaleString('id-ID')}</td></tr>`;
        }
        generatedSummary += `</tbody><tfoot><tr><td>Total</td><td class="text-right">${totalRedemption.toLocaleString('id-ID')}</td></tr></tfoot></table>`;
      } else {
        generatedSummary += `<p class='text-muted-foreground'>- Tidak ada data.</p>`;
      }
      generatedSummary += `</div>`;
      
      // Pengeluaran DO
      let totalDoRelease = 0;
      const doReleaseByProduct: Record<string, number> = {};
      dailyDoReleases.forEach(dr => {
        totalDoRelease += dr.quantity;
        const productId = redemptionProductMap[dr.doNumber];
        const productName = productId ? productMap[productId] : 'Produk tidak diketahui';
        doReleaseByProduct[productName] = (doReleaseByProduct[productName] || 0) + dr.quantity;
      });
      generatedSummary += `<div class='mt-4'><h4>Pengeluaran DO</h4>`;
      if (Object.keys(doReleaseByProduct).length > 0) {
        generatedSummary += `<table class="report-table"><thead><tr><th>Nama Produk</th><th class="text-right">QTY (Ton)</th></tr></thead><tbody>`;
        for (const productName in doReleaseByProduct) {
          generatedSummary += `<tr><td>${productName}</td><td class="text-right">${doReleaseByProduct[productName].toLocaleString('id-ID')}</td></tr>`;
        }
        generatedSummary += `</tbody><tfoot><tr><td>Total</td><td class="text-right">${totalDoRelease.toLocaleString('id-ID')}</td></tr></tfoot></table>`;
      } else {
        generatedSummary += `<p class='text-muted-foreground'>- Tidak ada data.</p>`;
      }
      generatedSummary += `</div>`;


      // Penyaluran
      let totalDistribution = 0;
      const distByKiosk: Record<string, { product: string, quantity: number }[]> = {};
      dailyDistributions.forEach(dist => {
        totalDistribution += dist.quantity;
        const kioskName = kioskMap[dist.kioskId] || 'Kios tidak diketahui';
        const productId = redemptionProductMap[dist.doNumber];
        const productName = productId ? productMap[productId] : 'Produk tidak diketahui';
        if (!distByKiosk[kioskName]) {
          distByKiosk[kioskName] = [];
        }
        distByKiosk[kioskName].push({ product: productName, quantity: dist.quantity });
      });
      generatedSummary += `<div class='mt-4'><h4>Penyaluran Kios</h4>`;
      if (Object.keys(distByKiosk).length > 0) {
        generatedSummary += `<table class="report-table"><thead><tr><th>Nama Kios</th><th>Nama Produk</th><th class="text-right">QTY (Ton)</th></tr></thead><tbody>`;
        for (const kioskName in distByKiosk) {
            distByKiosk[kioskName].forEach((item, index) => {
                generatedSummary += `<tr>`;
                if(index === 0) {
                    generatedSummary += `<td rowspan="${distByKiosk[kioskName].length}">${kioskName}</td>`;
                }
                generatedSummary += `<td>${item.product}</td><td class="text-right">${item.quantity.toLocaleString('id-ID')}</td></tr>`;
            });
        }
        generatedSummary += `</tbody><tfoot><tr><td colspan="2">Total</td><td class="text-right">${totalDistribution.toLocaleString('id-ID')}</td></tr></tfoot></table>`;
      } else {
        generatedSummary += `<p class='text-muted-foreground'>- Tidak ada data.</p>`;
      }
      generatedSummary += `</div>`;

      setSummary(generatedSummary);

    } catch (error) {
      console.error("Summary generation error:", error);
      toast({
        title: 'Gagal Membuat Ringkasan',
        description: 'Terjadi kesalahan saat mengolah data.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPdf = async () => {
    if (!summary || !reportContentRef.current) {
      toast({ title: 'Laporan Kosong', description: 'Buat laporan terlebih dahulu.', variant: 'destructive' });
      return;
    }
    
    const html2pdf = (await import('html2pdf.js')).default;

    const element = document.createElement('div');
    element.innerHTML = summary;

    const opt = {
      margin:       0.5,
      filename:     `${summaryTitle.replace(/ /g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().from(element).set(opt).save();
  };

  const renderCalendar = (
    reportType: ReportType,
    date: Date | undefined,
    onSelect: (d: Date | undefined) => void,
    footer?: React.ReactNode
  ) => (
    <div className="flex flex-col items-center gap-4">
      {mounted ? (
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          className="rounded-md border"
          locale={id}
          disabled={(d) => d > new Date()}
          showOutsideDays={reportType !== 'bulanan'}
          footer={footer}
          {...(reportType === 'mingguan' && { showWeekNumber: true })}
          {...(reportType === 'bulanan' && {
            onMonthChange: onSelect,
            captionLayout: "dropdown-buttons",
            fromYear: 2020,
            toYear: new Date().getFullYear() + 1
          })}
        />
      ) : (
        <Skeleton className="h-[298px] w-[320px] rounded-md border" />
      )}
      <Button onClick={() => generateSummary(reportType)} disabled={isLoading || !date || !mounted} className="w-full">
        {isLoading ? 'Membuat Laporan...' : `Buat Laporan ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <h1 className="font-headline text-lg font-semibold md:text-2xl">
        Laporan
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Buat Laporan</CardTitle>
          <CardDescription>
            Pilih jenis laporan dan tanggal untuk membuat ringkasan aktivitas yang siap diekspor ke PDF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="harian" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="harian">Harian</TabsTrigger>
              <TabsTrigger value="mingguan">Mingguan</TabsTrigger>
              <TabsTrigger value="bulanan">Bulanan</TabsTrigger>
            </TabsList>
            <div className="mt-6 grid gap-8 md:grid-cols-2">
              <div>
                <TabsContent value="harian">
                  {renderCalendar('harian', selectedDate, setSelectedDate)}
                </TabsContent>
                <TabsContent value="mingguan">
                  {renderCalendar('mingguan', selectedWeek, setSelectedWeek, 
                    <p className="text-sm text-center text-muted-foreground pt-2">Pilih tanggal untuk menentukan minggu.</p>
                  )}
                </TabsContent>
                <TabsContent value="bulanan">
                  {renderCalendar('bulanan', selectedMonth, setSelectedMonth,
                    <p className="text-sm text-center text-muted-foreground pt-2">Gunakan panah untuk mengganti bulan.</p>
                  )}
                </TabsContent>
              </div>
              <div className="flex flex-col gap-4">
                <div className="grid w-full gap-1.5">
                  <Label htmlFor="summary">Pratinjau Laporan</Label>
                   <div className="border rounded-md p-4 min-h-[300px] prose prose-sm max-w-none overflow-auto">
                     <div ref={reportContentRef}>
                        {summary ? (
                           <div dangerouslySetInnerHTML={{ __html: summary.replace(/<h3.*?>.*?<\/h3>/, `<h4>${summaryTitle}</h4>`) }} />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            Laporan akan muncul di sini...
                          </div>
                        )}
                     </div>
                   </div>
                </div>
                <Button onClick={exportToPdf} disabled={!summary}>
                  <Download className="mr-2 h-4 w-4" /> Ekspor ke PDF
                </Button>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

    
