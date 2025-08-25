export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  sellPrice: number;
}

export interface Kiosk {
  id: string;
  name: string;
  address: string;
  phone: string;
  desa: string;
  kecamatan: string;
  penanggungJawab: string;
}

export interface Redemption {
  id: string;
  doNumber: string;
  supplier: string;
  date: string;
  productId: string;
  quantity: number;
}

export interface DORelease {
    id: string;
    doNumber: string;
    date: string;
    quantity: number;
    redemptionQuantity: number;
}

export interface KioskDistribution {
    id: string;
    doNumber: string;
    date: string;
    kioskId: string;
    quantity: number;
    directPayment: number;
}

export interface Payment {
    id: string;
    date: string;
    doNumber: string;
    kioskId: string;
    amount: number;
}

// Omit 'id' when creating a new entity
export type ProductInput = Omit<Product, 'id'>;
export type KioskInput = Omit<Kiosk, 'id'>;
export type RedemptionInput = Omit<Redemption, 'id'>;
export type DOReleaseInput = Omit<DORelease, 'id'>;
export type KioskDistributionInput = Omit<KioskDistribution, 'id'>;
export type PaymentInput = Omit<Payment, 'id'>;
