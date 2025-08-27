

export interface AppUser {
  uid: string;
  username: string;
  role: 'owner' | 'admin';
  branchId?: string;
  branchName?: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  created_at: string;
  name: string;
  purchasePrice: number;
  sellPrice: number;
  branchId: string;
}

export interface Kiosk {
  id: string;
  created_at: string;
  name: string;
  address: string;
  phone: string;
  desa: string;
  kecamatan: string;
  penanggungJawab: string;
  branchId: string;
}

export interface Redemption {
  id: string;
  created_at: string;
  doNumber: string;
  supplier: string;
  date: string;
  productId: string;
  quantity: number;
  branchId: string;
}

export interface DORelease {
    id: string;
    created_at: string;
    doNumber: string;
    date: string;
    quantity: number;
    redemptionQuantity: number;
    branchId: string;
}

export interface KioskDistribution {
    id: string;
    created_at: string;
    doNumber: string;
    date: string;
    kioskId: string;
    namaSopir: string;
    jamAngkut: string; // Format HH:mm
    quantity: number;
    directPayment: number;
    branchId: string;
}

export interface Payment {
    id: string;
    created_at: string;
    date: string;
    doNumber: string;
    kioskId: string;
    amount: number;
    branchId: string;
}

export interface KasUmum {
  id: string;
  created_at: string;
  date: string;
  description: string;
  type: 'debit' | 'credit';
  quantity: number;
  unitPrice: number;
  total: number;
  branchId: string;
}

export interface KasAngkutan {
    id: string;
    created_at: string;
    date: string;
    type: 'pemasukan' | 'pengeluaran';
    uangMasuk: number;
    pengeluaran: number;
    doNumber?: string;
    namaSopir?: string;
    uraian: string;
    adminFee: number;
    uangMakan: number;
    palang: number;
    solar: number;
    upahSopir: number;
    lembur: number;
    helper: number;
    branchId: string;
    nominal?: number;
}

// Omit 'id' and 'created_at' when creating a new entity
export type BranchInput = Omit<Branch, 'id'>;
export type ProductInput = Omit<Product, 'id' | 'created_at'>;
export type KioskInput = Omit<Kiosk, 'id' | 'created_at'>;
export type RedemptionInput = Omit<Redemption, 'id' | 'created_at'>;
export type DOReleaseInput = Omit<DORelease, 'id' | 'created_at'>;
export type KioskDistributionInput = Omit<KioskDistribution, 'id' | 'created_at'>;
export type PaymentInput = Omit<Payment, 'id' | 'created_at'>;
export type KasUmumInput = Omit<KasUmum, 'id' | 'created_at' | 'total'>;
export type KasAngkutanInput = Omit<KasAngkutan, 'id' | 'created_at'>;
