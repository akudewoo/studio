import type { Product, Kiosk, Redemption, DORelease, KioskDistribution, Payment } from './types';

export const initialProducts: Product[] = [
  { id: 'prod-1', name: 'Pupuk Urea', purchasePrice: 2000, sellPrice: 2500 },
  { id: 'prod-2', name: 'Pupuk NPK', purchasePrice: 3000, sellPrice: 3500 },
  { id: 'prod-3', name: 'Pestisida A', purchasePrice: 15000, sellPrice: 17500 },
  { id: 'prod-4', name: 'Benih Jagung Hibrida', purchasePrice: 50000, sellPrice: 60000 },
];

export const initialKiosks: Kiosk[] = [
  { id: 'kiosk-1', name: 'Kios Tani Makmur', address: 'Jl. Raya No. 1', phone: '081234567890' },
  { id: 'kiosk-2', name: 'Kios Tani Jaya', address: 'Jl. Desa No. 2', phone: '081234567891' },
  { id: 'kiosk-3', name: 'Kios Mitra Tani', address: 'Jl. Sawah No. 3', phone: '081234567892' },
];

export const initialRedemptions: Redemption[] = [
    { id: 'red-1', doNumber: 'DO-2024-001', supplier: 'PT Pupuk Indonesia', date: new Date('2024-05-01').toISOString(), productId: 'prod-1', quantity: 1000 },
    { id: 'red-2', doNumber: 'DO-2024-002', supplier: 'PT Petrokimia Gresik', date: new Date('2024-05-05').toISOString(), productId: 'prod-2', quantity: 500 },
];

export const initialDOReleases: DORelease[] = [
    { id: 'dor-1', doNumber: 'DO-2024-001', date: new Date('2024-05-02').toISOString(), quantity: 1000, redemptionQuantity: 1000 },
    { id: 'dor-2', doNumber: 'DO-2024-002', date: new Date('2024-05-06').toISOString(), quantity: 400, redemptionQuantity: 500 },
];

export const initialKioskDistributions: KioskDistribution[] = [
    { id: 'dist-1', doNumber: 'DO-2024-001', date: new Date('2024-05-10').toISOString(), kioskId: 'kiosk-1', quantity: 200, directPayment: 250000 },
    { id: 'dist-2', doNumber: 'DO-2024-001', date: new Date('2024-05-11').toISOString(), kioskId: 'kiosk-2', quantity: 300, directPayment: 0 },
    { id: 'dist-3', doNumber: 'DO-2024-002', date: new Date('2024-05-12').toISOString(), kioskId: 'kiosk-1', quantity: 150, directPayment: 525000 },
];

export const initialPayments: Payment[] = [
    { id: 'pay-1', date: new Date('2024-06-01').toISOString(), doNumber: 'DO-2024-001', kioskId: 'kiosk-2', amount: 500000 },
];
