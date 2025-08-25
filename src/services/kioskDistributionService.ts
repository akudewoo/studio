import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { KioskDistribution, KioskDistributionInput } from '@/lib/types';

const kioskDistributionsCollection = collection(db, 'kioskDistributions');

export async function addKioskDistribution(distribution: KioskDistributionInput): Promise<KioskDistribution> {
    const docRef = await addDoc(kioskDistributionsCollection, distribution);
    return { id: docRef.id, ...distribution };
}

export async function getKioskDistributions(): Promise<KioskDistribution[]> {
    const snapshot = await getDocs(kioskDistributionsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KioskDistribution));
}

export async function updateKioskDistribution(id: string, distribution: Partial<KioskDistribution>): Promise<void> {
    const distributionDoc = doc(db, 'kioskDistributions', id);
    await updateDoc(distributionDoc, distribution);
}

export async function deleteKioskDistribution(id: string): Promise<void> {
    const distributionDoc = doc(db, 'kioskDistributions', id);
    await deleteDoc(distributionDoc);
}

export async function deleteMultipleKioskDistributions(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const distributionDoc = doc(db, 'kioskDistributions', id);
        batch.delete(distributionDoc);
    });
    await batch.commit();
}
