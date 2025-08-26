
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { KasUmum, KasUmumInput } from '@/lib/types';

const kasUmumCollection = collection(db, 'kasUmum');

export async function addKasUmum(kas: KasUmumInput): Promise<KasUmum> {
    const docRef = await addDoc(kasUmumCollection, kas);
    return { id: docRef.id, ...kas };
}

export async function addMultipleKasUmum(kases: KasUmumInput[]): Promise<KasUmum[]> {
    const batch = writeBatch(db);
    const newKases: KasUmum[] = [];
    kases.forEach(kas => {
        const docRef = doc(kasUmumCollection);
        batch.set(docRef, kas);
        newKases.push({ id: docRef.id, ...kas });
    });
    await batch.commit();
    return newKases;
}

export async function getKasUmum(branchIds: string[]): Promise<KasUmum[]> {
    if (branchIds.length === 0) return [];
    const q = query(kasUmumCollection, where("branchId", "in", branchIds));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KasUmum));
}

export async function updateKasUmum(id: string, kas: Partial<KasUmum>): Promise<void> {
    const kasDoc = doc(db, 'kasUmum', id);
    await updateDoc(kasDoc, kas);
}

export async function deleteKasUmum(id: string): Promise<void> {
    const kasDoc = doc(db, 'kasUmum', id);
    await deleteDoc(kasDoc);
}

export async function deleteMultipleKasUmum(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const kasDoc = doc(db, 'kasUmum', id);
        batch.delete(kasDoc);
    });
    await batch.commit();
}
