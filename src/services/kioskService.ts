import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Kiosk, KioskInput } from '@/lib/types';

const kiosksCollection = collection(db, 'kiosks');

export async function addKiosk(kiosk: KioskInput): Promise<Kiosk> {
    const docRef = await addDoc(kiosksCollection, kiosk);
    return { id: docRef.id, ...kiosk };
}

export async function addMultipleKiosks(kiosks: KioskInput[]): Promise<Kiosk[]> {
    const batch = writeBatch(db);
    const newKiosks: Kiosk[] = [];
    kiosks.forEach(kiosk => {
        const docRef = doc(kiosksCollection);
        batch.set(docRef, kiosk);
        newKiosks.push({ id: docRef.id, ...kiosk });
    });
    await batch.commit();
    return newKiosks;
}

export async function getKiosks(branchId: string): Promise<Kiosk[]> {
    const q = query(kiosksCollection, where("branchId", "==", branchId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kiosk));
}

export async function updateKiosk(id: string, kiosk: Partial<Kiosk>): Promise<void> {
    const kioskDoc = doc(db, 'kiosks', id);
    await updateDoc(kioskDoc, kiosk);
}

export async function deleteKiosk(id: string): Promise<void> {
    const kioskDoc = doc(db, 'kiosks', id);
    await deleteDoc(kioskDoc);
}

export async function deleteMultipleKiosks(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const kioskDoc = doc(db, 'kiosks', id);
        batch.delete(kioskDoc);
    });
    await batch.commit();
}
