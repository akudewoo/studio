import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Redemption, RedemptionInput } from '@/lib/types';

const redemptionsCollection = collection(db, 'redemptions');

export async function addRedemption(redemption: RedemptionInput): Promise<Redemption> {
    const docRef = await addDoc(redemptionsCollection, redemption);
    return { id: docRef.id, ...redemption };
}

export async function getRedemptions(): Promise<Redemption[]> {
    const snapshot = await getDocs(redemptionsCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Redemption));
}

export async function updateRedemption(id: string, redemption: Partial<Redemption>): Promise<void> {
    const redemptionDoc = doc(db, 'redemptions', id);
    await updateDoc(redemptionDoc, redemption);
}

export async function deleteRedemption(id: string): Promise<void> {
    const redemptionDoc = doc(db, 'redemptions', id);
    await deleteDoc(redemptionDoc);
}

export async function deleteMultipleRedemptions(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const redemptionDoc = doc(db, 'redemptions', id);
        batch.delete(redemptionDoc);
    });
    await batch.commit();
}
