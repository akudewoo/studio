import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Kiosk, KioskInput } from '@/lib/types';

const kiosksCollection = collection(db, 'kiosks');

export async function addKiosk(kiosk: KioskInput): Promise<Kiosk> {
    const docRef = await addDoc(kiosksCollection, kiosk);
    return { id: docRef.id, ...kiosk };
}

export async function getKiosks(): Promise<Kiosk[]> {
    const snapshot = await getDocs(kiosksCollection);
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
