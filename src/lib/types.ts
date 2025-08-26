import { User as FirebaseUser } from 'firebase/auth';

export interface AppUser extends FirebaseUser {
  role?: 'owner' | 'admin';
  branchId?: string;
}

export interface Branch {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  sellPrice: number;
  branchId: string;
}

export interface Kiosk {
  id: string;
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
  doNumber: string;
  supplier: string;
  date: string;
  productId: string;
  quantity: number;
  branchId: string;
}

export interface DORelease {
    id: string;
    doNumber: string;
    date: string;
    quantity: number;
    redemptionQuantity: number;
    branchId: string;
}

export interface KioskDistribution {
    id: string;
    doNumber: string;
    date: string;
    kioskId: string;
    quantity: number;
    directPayment: number;
    branchId: string;
}

export interface Payment {
    id: string;
    date: string;
    doNumber: string;
    kioskId: string;
    amount: number;
    branchId: string;
}

export interface KasUmum {
  id: string;
  date: string;
  description: string;
  type: 'debit' | 'credit';
  quantity: number;
  unitPrice: number;
  total: number;
  branchId: string;
}

// Omit 'id' when creating a new entity
export type BranchInput = Omit<Branch, 'id'>;
export type ProductInput = Omit<Product, 'id'>;
export type KioskInput = Omit<Kiosk, 'id'>;
export type RedemptionInput = Omit<Redemption, 'id'>;
export type DOReleaseInput = Omit<DORelease, 'id'>;
export type KioskDistributionInput = Omit<KioskDistribution, 'id'>;
export type PaymentInput = Omit<Payment, 'id'>;
export type KasUmumInput = Omit<KasUmum, 'id'>;
