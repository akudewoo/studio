
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getRedemptions } from '@/services/redemptionService';
import { getDOReleases } from '@/services/doReleaseService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import type { Redemption, DORelease, KioskDistribution, Kiosk, Product } from '@/lib/types';
import { MessageCircle } from 'lucide-react';

export default function RingkasanHarianPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [summary, setSummary] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [doReleases, setDoReleases] = useState<DORelease[]>([]);
  const [distributions, setDistributions] = useState<KioskDistribution[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
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
      }
    }
    loadData();
  }, [toast]);

  const handleGenerateSummary = async () => {
    if (!selectedDate) {
      toast({ title: 'Tanggal belum dipilih', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    setSummary('');

    try {
      const formattedDate = format(selectedDate, 'd MMMM yyyy', { locale: id });
      const kioskMap = kiosks.reduce((map, k) => { map[k.id] = k.name; return map }, {} as Record<string, string>);
      const productMap = products.reduce((map, p) => { map[p.id] = p.name; return map }, {} as Record<string, string>);
      const redemptionProductMap = redemptions.reduce((map, r) => { map[r.doNumber] = r.productId; return map }, {} as Record<string, string>);

      const dailyRedemptions = redemptions.filter(r => format(new Date(r.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
      const dailyDoReleases = doReleases.filter(dr => format(new Date(dr.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));
      const dailyDistributions = distributions.filter(d => format(new Date(d.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'));

      let manualSummary = `*Ringkasan Harian - ${formattedDate}*\n\n`;

      // Penebusan
      let totalRedemption = 0;
      const redemptionByProduct: Record<string, number> = {};
      dailyRedemptions.forEach(r => {
        totalRedemption += r.quantity;
        const productName = productMap[r.productId] || 'Produk tidak diketahui';
        redemptionByProduct[productName] = (redemptionByProduct[productName] || 0) + r.quantity;
      });
      manualSummary += `*Penebusan*\n`;
      manualSummary += `Total: *${totalRedemption.toLocaleString('id-ID')} Ton*\n`;
      if (Object.keys(redemptionByProduct).length > 0) {
        for (const productName in redemptionByProduct) {
          manualSummary += `- ${productName}: ${redemptionByProduct[productName].toLocaleString('id-ID')} Ton\n`;
        }
      } else {
        manualSummary += `- Tidak ada data.\n`;
      }
      manualSummary += `\n`;

      // Pengeluaran DO
      let totalDoRelease = 0;
      const doReleaseByProduct: Record<string, number> = {};
      dailyDoReleases.forEach(dr => {
        totalDoRelease += dr.quantity;
        const productId = redemptionProductMap[dr.doNumber];
        const productName = productId ? productMap[productId] : 'Produk tidak diketahui';
        doReleaseByProduct[productName] = (doReleaseByProduct[productName] || 0) + dr.quantity;
      });
      manualSummary += `*Pengeluaran DO*\n`;
      manualSummary += `Total: *${totalDoRelease.toLocaleString('id-ID')} Ton*\n`;
      if (Object.keys(doReleaseByProduct).length > 0) {
        for (const productName in doReleaseByProduct) {
          manualSummary += `- ${productName}: ${doReleaseByProduct[productName].toLocaleString('id-ID')} Ton\n`;
        }
      } else {
        manualSummary += `- Tidak ada data.\n`;
      }
      manualSummary += `\n`;

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
      manualSummary += `*Penyaluran Kios*\n`;
      manualSummary += `Total: *${totalDistribution.toLocaleString('id-ID')} Ton*\n`;
      if (Object.keys(distByKiosk).length > 0) {
        for (const kioskName in distByKiosk) {
          const totalPerKiosk = distByKiosk[kioskName].reduce((sum, item) => sum + item.quantity, 0);
          manualSummary += `- *${kioskName}*: ${totalPerKiosk.toLocaleString('id-ID')} Ton\n`;
        }
      } else {
        manualSummary += `- Tidak ada data.\n`;
      }

      setSummary(manualSummary);

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

  const handleSendToWhatsApp = () => {
    if (!summary) {
      toast({ title: 'Ringkasan Kosong', description: 'Buat ringkasan terlebih dahulu.', variant: 'destructive' });
      return;
    }
    if (!phoneNumber) {
      toast({ title: 'Nomor WhatsApp Kosong', description: 'Masukkan nomor WhatsApp tujuan.', variant: 'destructive' });
      return;
    }

    // Format phone number for WhatsApp URL (e.g., remove leading 0, add country code)
    const formattedPhoneNumber = phoneNumber.startsWith('0') ? `62${phoneNumber.substring(1)}` : phoneNumber;
    const encodedSummary = encodeURIComponent(summary);
    const whatsappUrl = `https://wa.me/${formattedPhoneNumber}?text=${encodedSummary}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <h1 className="font-headline text-lg font-semibold md:text-2xl">
        Ringkasan Harian
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Buat Ringkasan Harian</CardTitle>
          <CardDescription>
            Pilih tanggal untuk membuat ringkasan aktivitas yang siap dikirim ke WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="flex flex-col items-center gap-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                locale={id}
                disabled={(date) => date > new Date()}
              />
              <Button onClick={handleGenerateSummary} disabled={isLoading || !selectedDate} className="w-full">
                {isLoading ? 'Membuat Ringkasan...' : 'Buat Ringkasan'}
              </Button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="summary">Ringkasan Laporan</Label>
                <Textarea
                  id="summary"
                  placeholder="Ringkasan laporan akan muncul di sini..."
                  value={summary}
                  readOnly
                  rows={15}
                />
              </div>
              <div className="grid w-full gap-1.5">
                <Label htmlFor="whatsapp-number">Nomor WhatsApp Tujuan</Label>
                <Input
                  id="whatsapp-number"
                  type="tel"
                  placeholder="cth. 081234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <Button onClick={handleSendToWhatsApp} disabled={!summary || !phoneNumber}>
                <MessageCircle className="mr-2 h-4 w-4" /> Kirim via WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
