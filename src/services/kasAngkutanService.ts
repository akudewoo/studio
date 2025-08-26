
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { KasAngkutan, KasAngkutanInput } from '@/lib/types';

const kasAngkutanCollection = collection(db, 'kasAngkutan');

export async function addKasAngkutan(kas: KasAngkutanInput): Promise<KasAngkutan> {
    const docRef = await addDoc(kasAngkutanCollection, kas);
    return { id: docRef.id, ...kas };
}

export async function getKasAngkutan(branchId: string): Promise<KasAngkutan[]> {
    const q = branchId === 'all'
        ? kasAngkutanCollection
        : query(kasAngkutanCollection, where("branchId", "==", branchId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KasAngkutan));
}

export async function updateKasAngkutan(id: string, kas: Partial<KasAngkutan>): Promise<void> {
    const kasDoc = doc(db, 'kasAngkutan', id);
    await updateDoc(kasDoc, kas);
}

export async function deleteKasAngkutan(id: string): Promise<void> {
    const kasDoc = doc(db, 'kasAngkutan', id);
    await deleteDoc(kasDoc);
}

export async function deleteMultipleKasAngkutan(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const kasDoc = doc(db, 'kasAngkutan', id);
        batch.delete(kasDoc);
    });
    await batch.commit();
}
