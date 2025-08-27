
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const comparisonData = [
  {
    feature: 'Cloud Firestore',
    spark: '1 GiB total',
    blaze: '1 GiB total',
    notes: 'Setelah kuota gratis, biaya per GiB penyimpanan dan per operasi baca/tulis/hapus.',
  },
  {
    feature: 'Cloud Storage',
    spark: '5 GiB total',
    blaze: '5 GiB total',
    notes: 'Biaya per GiB penyimpanan dan per operasi upload/download setelah kuota gratis.',
  },
  {
    feature: 'App Hosting',
    spark: <XCircle className="h-5 w-5 text-destructive" />,
    blaze: 'Tingkat gratis tersedia',
    notes: 'Memerlukan paket Blaze, dengan biaya untuk instance, CPU, memori, dan egress di atas kuota gratis.',
  },
  {
    feature: 'Cloud Functions',
    spark: <XCircle className="h-5 w-5 text-destructive" />,
    blaze: 'Tingkat gratis tersedia',
    notes: 'Biaya per pemanggilan, waktu komputasi (GB-detik), dan egress setelah kuota gratis.',
  },
  {
    feature: 'Batas Pemakaian Terlampaui',
    spark: 'Layanan dihentikan',
    blaze: 'Bayar sesuai pemakaian',
    notes: 'Perbedaan paling mendasar antara kedua paket.',
  },
];

export default function PricingComparisonPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
      <h1 className="font-headline text-lg font-semibold md:text-2xl">Perbandingan Paket Firebase</h1>
      <Card>
        <CardHeader>
          <CardTitle>Spark (Gratis) vs Blaze (Bayar Sesuai Pemakaian)</CardTitle>
          <CardDescription>
            Tingkat gratis pada paket Blaze sama dengan kuota paket Spark. Perbedaan utamanya adalah apa yang terjadi setelah kuota gratis terlampaui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Fitur</TableHead>
                  <TableHead className="text-center">Paket Spark (Gratis)</TableHead>
                  <TableHead className="text-center">Paket Blaze (Kuota Gratis)</TableHead>
                  <TableHead className="w-1/3">Catatan & Setelah Kuota Gratis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.feature}</TableCell>
                    <TableCell className="text-center">{typeof item.spark === 'string' ? item.spark : <div className="flex justify-center">{item.spark}</div>}</TableCell>
                    <TableCell className="text-center">{typeof item.blaze === 'string' ? item.blaze : <div className="flex justify-center">{item.blaze}</div>}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
           <div className="mt-6 flex items-center justify-center rounded-lg border border-dashed p-6 text-center">
                <div className="flex flex-col items-center gap-2">
                    <h3 className="font-semibold">Kesimpulan Utama</h3>
                    <p className="text-muted-foreground">
                        Gunakan paket <span className="font-semibold text-primary">Blaze</span> untuk menghilangkan batas pemakaian yang kaku dan memastikan aplikasi Anda tetap berjalan saat berkembang.
                    </p>
                    <a
                        href="https://firebase.google.com/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center text-sm font-medium text-primary hover:underline"
                    >
                        Lihat Harga Resmi Firebase <ArrowRight className="ml-1 h-4 w-4" />
                    </a>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

