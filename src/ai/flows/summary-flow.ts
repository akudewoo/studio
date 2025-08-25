
'use server';
/**
 * @fileOverview A flow for generating a daily summary for WhatsApp.
 *
 * - generateDailySummary - A function that generates a formatted daily summary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DailySummaryInputSchema = z.object({
  date: z.string().describe('The date for the summary in "d MMMM yyyy" format.'),
  redemptionQty: z.number().describe('Total quantity of redemptions in Kg.'),
  doReleaseQty: z.number().describe('Total quantity of DO releases in Kg.'),
  distributions: z.record(z.array(z.object({
    product: z.string(),
    quantity: z.number()
  }))).describe('A record of product distributions to kiosks, where the key is the kiosk name.')
});

type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

const summaryFlow = ai.defineFlow(
  {
    name: 'summaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: z.string(),
  },
  async (data) => {
    const prompt = ai.definePrompt({
      name: 'summaryPrompt',
      input: { schema: DailySummaryInputSchema },
      output: { format: 'text' },
      prompt: `
        Anda adalah asisten AI yang bertugas membuat laporan harian untuk bisnis distribusi pupuk.
        Buat ringkasan singkat, jelas, dan ramah untuk dikirim melalui WhatsApp berdasarkan data berikut.
        Gunakan format yang rapi dengan emoji yang sesuai.

        Data untuk Laporan Tanggal: {{{date}}}

        - Total Penebusan: {{{redemptionQty}}} Kg
        - Total Pengeluaran DO: {{{doReleaseQty}}} Kg

        - Detail Penyaluran Kios:
          {{#each distributions}}
          - *{{@key}}*:
            {{#each this}}
            • {{this.product}}: {{this.quantity}} Kg
            {{/each}}
          {{else}}
          - Tidak ada data penyaluran hari ini.
          {{/each}}
        
        Format output harus berupa teks biasa yang siap untuk disalin dan ditempel ke WhatsApp.
        Mulai dengan judul yang jelas seperti "*Laporan Harian - [Tanggal]*".
        Gunakan bold (tanda bintang) untuk judul dan item utama.
      `,
    });
    
    const { output } = await prompt(data);
    return output || 'Tidak dapat membuat ringkasan.';
  }
);


export async function generateDailySummary(input: DailySummaryInput): Promise<string> {
  return await summaryFlow(input);
}
