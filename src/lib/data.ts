import type { AppUser, Branch, Product, Kiosk, Redemption, DORelease, KioskDistribution, Payment, KasUmum, KasAngkutan } from './types';

// Hardcoded branches
export const hardcodedBranches: Branch[] = [
    { id: 'magetan-01', name: 'MAGETAN' },
    { id: 'sragen-02', name: 'SRAGEN' }
];

// Hardcoded users
export const hardcodedUsers: AppUser[] = [
    { 
      uid: 'user-owner-001',
      username: 'Owner', 
      password: 'Owner', 
      role: 'owner'
    },
    { 
      uid: 'user-admin-001',
      username: 'tmmagetan', 
      password: 'tmmagetan', 
      role: 'admin', 
      branchId: 'magetan-01',
      branchName: 'MAGETAN'
    },
    { 
      uid: 'user-admin-002',
      username: 'tmsragen', 
      password: 'tmsragen', 
      role: 'admin', 
      branchId: 'sragen-02',
      branchName: 'SRAGEN'
    }
];

export const hardcodedProducts: Product[] = [
    { id: 'prod-001', name: 'UREA', purchasePrice: 2250, sellPrice: 2750, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'prod-002', name: 'NPK', purchasePrice: 2300, sellPrice: 2800, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'prod-003', name: 'ZA', purchasePrice: 1700, sellPrice: 2200, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'prod-004', name: 'UREA', purchasePrice: 2250, sellPrice: 2750, branchId: 'sragen-02', created_at: new Date().toISOString() },
    { id: 'prod-005', name: 'NPK', purchasePrice: 2300, sellPrice: 2800, branchId: 'sragen-02', created_at: new Date().toISOString() },
];

export const hardcodedKiosks: Kiosk[] = [
    { id: 'kiosk-001', name: 'Kios Tani Maju', address: 'Jl. Raya Magetan 1', phone: '08123456789', desa: 'Sukamaju', kecamatan: 'Magetan', penanggungJawab: 'Budi Santoso', branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'kiosk-002', name: 'Kios Sumber Rejeki', address: 'Jl. Raya Sragen 2', phone: '08123456780', desa: 'Sumber', kecamatan: 'Sragen', penanggungJawab: 'Siti Aminah', branchId: 'sragen-02', created_at: new Date().toISOString() },
];

export const hardcodedRedemptions: Redemption[] = [
    { id: 'red-001', doNumber: 'DO-M-001', supplier: 'PT. PETROKIMIA GRESIK', date: '2024-05-01T10:00:00.000Z', productId: 'prod-001', quantity: 10, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'red-002', doNumber: 'DO-S-001', supplier: 'PT. PUPUK SRIWIJAYA', date: '2024-05-02T11:00:00.000Z', productId: 'prod-004', quantity: 15, branchId: 'sragen-02', created_at: new Date().toISOString() },
];

export const hardcodedDoReleases: DORelease[] = [
    { id: 'rel-001', doNumber: 'DO-M-001', date: '2024-05-05T09:00:00.000Z', quantity: 10, redemptionQuantity: 10, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'rel-002', doNumber: 'DO-S-001', date: '2024-05-06T09:00:00.00Z', quantity: 15, redemptionQuantity: 15, branchId: 'sragen-02', created_at: new Date().toISOString() },
];

export const hardcodedKioskDistributions: KioskDistribution[] = [
    { id: 'dist-001', doNumber: 'DO-M-001', date: '2024-05-10T14:00:00.000Z', kioskId: 'kiosk-001', namaSopir: 'Agus', jamAngkut: '14:30', quantity: 5, directPayment: 5000000, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'dist-002', doNumber: 'DO-S-001', date: '2024-05-11T15:00:00.000Z', kioskId: 'kiosk-002', namaSopir: 'Joko', jamAngkut: '15:00', quantity: 10, directPayment: 10000000, branchId: 'sragen-02', created_at: new Date().toISOString() },
];

export const hardcodedPayments: Payment[] = [
    { id: 'pay-001', date: '2024-05-20T10:00:00.000Z', doNumber: 'DO-M-001', kioskId: 'kiosk-001', amount: 3750000, branchId: 'magetan-01', created_at: new Date().toISOString() },
];

export const hardcodedKasUmum: KasUmum[] = [
    { id: 'ku-001', date: '2024-05-01T08:00:00.000Z', description: 'Setoran Awal Kas', type: 'debit', quantity: 1, unitPrice: 50000000, total: 50000000, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'ku-002', date: '2024-05-03T13:00:00.000Z', description: 'Pembelian ATK', type: 'credit', quantity: 1, unitPrice: 250000, total: 250000, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'ku-003', date: '2024-05-01T08:00:00.000Z', description: 'Setoran Awal Kas', type: 'debit', quantity: 1, unitPrice: 75000000, total: 75000000, branchId: 'sragen-02', created_at: new Date().toISOString() },
];

export const hardcodedKasAngkutan: KasAngkutan[] = [
    { id: 'ka-001', date: '2024-05-10T14:30:00.000Z', type: 'pengeluaran', uangMasuk: 0, pengeluaran: 0, doNumber: 'DO-M-001', namaSopir: 'Agus', uraian: 'Biaya DO: DO-M-001', adminFee: 15625, uangMakan: 40000, palang: 25000, solar: 62500, upahSopir: 17500, lembur: 10000, helper: 25000, branchId: 'magetan-01', created_at: new Date().toISOString() },
    { id: 'ka-002', date: '2024-05-15T09:00:00.000Z', type: 'pemasukan', uangMasuk: 500000, pengeluaran: 0, uraian: 'Pemasukan dari Kasir', adminFee: 0, uangMakan: 0, palang: 0, solar: 0, upahSopir: 0, lembur: 0, helper: 0, branchId: 'magetan-01', created_at: new Date().toISOString() },
];
