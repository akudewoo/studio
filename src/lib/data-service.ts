import {
    hardcodedBranches,
    hardcodedProducts,
    hardcodedKiosks,
    hardcodedRedemptions,
    hardcodedDoReleases,
    hardcodedKioskDistributions,
    hardcodedPayments,
    hardcodedKasUmum,
    hardcodedKasAngkutan
} from './data';
import type { Branch, Product, Kiosk, Redemption, DORelease, KioskDistribution, Payment, KasUmum, KasAngkutan } from './types';

function filterByBranch<T extends { branchId: string }>(data: T[], branchId: string): T[] {
    if (branchId === 'all') return data;
    return data.filter(item => item.branchId === branchId);
}

// --- Branch Service ---
export async function getBranches(): Promise<Branch[]> {
    return Promise.resolve(hardcodedBranches);
}

// --- Product Service ---
export async function getProducts(branchId: string): Promise<Product[]> {
    return Promise.resolve(filterByBranch(hardcodedProducts, branchId));
}

// --- Kiosk Service ---
export async function getKiosks(branchId: string): Promise<Kiosk[]> {
    return Promise.resolve(filterByBranch(hardcodedKiosks, branchId));
}

// --- Redemption Service ---
export async function getRedemptions(branchId: string): Promise<Redemption[]> {
    return Promise.resolve(filterByBranch(hardcodedRedemptions, branchId));
}

// --- DORelease Service ---
export async function getDOReleases(branchId: string): Promise<DORelease[]> {
    return Promise.resolve(filterByBranch(hardcodedDoReleases, branchId));
}

// --- KioskDistribution Service ---
export async function getKioskDistributions(branchId: string): Promise<KioskDistribution[]> {
    return Promise.resolve(filterByBranch(hardcodedKioskDistributions, branchId));
}

// --- Payment Service ---
export async function getPayments(branchId: string): Promise<Payment[]> {
    return Promise.resolve(filterByBranch(hardcodedPayments, branchId));
}

// --- KasUmum Service ---
export async function getKasUmum(branchIds: string[] | string): Promise<KasUmum[]> {
    const ids = Array.isArray(branchIds) ? branchIds : [branchIds];
     if (ids.includes('all')) return Promise.resolve(hardcodedKasUmum);
    return Promise.resolve(hardcodedKasUmum.filter(item => ids.includes(item.branchId)));
}

// --- KasAngkutan Service ---
export async function getKasAngkutan(branchId: string): Promise<KasAngkutan[]> {
    return Promise.resolve(filterByBranch(hardcodedKasAngkutan, branchId));
}

// --- Combined Data Fetcher ---
export async function getAllDataForBranch(branchId: string) {
    const [
        products,
        kiosks,
        redemptions,
        doReleases,
        distributions,
        payments,
        kasUmum,
        kasAngkutan
    ] = await Promise.all([
        getProducts(branchId),
        getKiosks(branchId),
        getRedemptions(branchId),
        getDOReleases(branchId),
        getKioskDistributions(branchId),
        getPayments(branchId),
        getKasUmum(branchId),
        getKasAngkutan(branchId)
    ]);

    return {
        products,
        kiosks,
        redemptions,
        doReleases,
        distributions,
        payments,
        kasUmum,
        kasAngkutan
    };
}
