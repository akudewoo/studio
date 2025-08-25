
'use client';

import { useState, useEffect, useRef } from 'react';
import { format, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
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
import type { Redemption, DORelease, KioskDistribution, Kiosk, Product } from '@/lib/types';
import { Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type ReportType = 'harian' | 'mingguan' | 'bulanan';

export default function LaporanPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
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
        const [redemptionsData, doReleasesData, distributionsData, kiosksData, productsData] = await Promise.all([
          getRedemptions(),
          getDOReleases(),
          getKioskDistributions(),
          getKiosks(),
          getProducts(),
        ]);
        setRedemptions(redemptionsData);
        setDoReleases(doReleasesData);
        setDistributions(distributionsData);
        setKiosks(kiosksData);
        setProducts(productsData);
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
        dateForReport = selectedDate;
        title = `Laporan Harian - ${format(dateForReport, 'd MMMM yyyy', { locale: id })}`;
        dateFilter = (date) => isSameDay(date, dateForReport!);
        break;
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

      let generatedSummary = ``;

      // Penebusan
      let totalRedemption = 0;
      const redemptionByProduct: Record<string, number> = {};
      dailyRedemptions.forEach(r => {
        totalRedemption += r.quantity;
        const productName = productMap[r.productId] || 'Produk tidak diketahui';
        redemptionByProduct[productName] = (redemptionByProduct[productName] || 0) + r.quantity;
      });
      generatedSummary += `<div><h4>Penebusan</h4>`;
      generatedSummary += `<p>Total: <strong>${totalRedemption.toLocaleString('id-ID')} Ton</strong></p>`;
      if (Object.keys(redemptionByProduct).length > 0) {
        generatedSummary += `<ul>`;
        for (const productName in redemptionByProduct) {
          generatedSummary += `<li>${productName}: ${redemptionByProduct[productName].toLocaleString('id-ID')} Ton</li>`;
        }
        generatedSummary += `</ul>`;
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
      generatedSummary += `<p>Total: <strong>${totalDoRelease.toLocaleString('id-ID')} Ton</strong></p>`;
      if (Object.keys(doReleaseByProduct).length > 0) {
        generatedSummary += `<ul>`;
        for (const productName in doReleaseByProduct) {
          generatedSummary += `<li>${productName}: ${doReleaseByProduct[productName].toLocaleString('id-ID')} Ton</li>`;
        }
        generatedSummary += `</ul>`;
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
      generatedSummary += `<p>Total: <strong>${totalDistribution.toLocaleString('id-ID')} Ton</strong></p>`;
      if (Object.keys(distByKiosk).length > 0) {
        generatedSummary += `<ul>`;
        for (const kioskName in distByKiosk) {
          const totalPerKiosk = distByKiosk[kioskName].reduce((sum, item) => sum + item.quantity, 0);
          generatedSummary += `<li><strong>${kioskName}</strong>: ${totalPerKiosk.toLocaleString('id-ID')} Ton</li>`;
        }
        generatedSummary += `</ul>`;
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
    
    // Dynamically import html2pdf.js only on the client-side
    const html2pdf = (await import('html2pdf.js')).default;

    const element = reportContentRef.current;
    const opt = {
      margin:       1,
      filename:     `${summaryTitle.replace(/ /g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
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
                   <div ref={reportContentRef} className="border rounded-md p-4 min-h-[300px] prose prose-sm max-w-none">
                     {summary ? (
                       <>
                         <h3 className='font-bold text-lg'>{summaryTitle}</h3>
                         <div dangerouslySetInnerHTML={{ __html: summary }} />
                       </>
                     ) : (
                       <div className="flex items-center justify-center h-full text-muted-foreground">
                         Laporan akan muncul di sini...
                       </div>
                     )}
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
