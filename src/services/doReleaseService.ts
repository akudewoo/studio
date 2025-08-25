import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DORelease, DOReleaseInput } from '@/lib/types';

const doReleasesCollection = collection(db, 'doReleases');

export async function addDORelease(doRelease: DOReleaseInput): Promise<DORelease> {
    const docRef = await addDoc(doReleasesCollection, doRelease);
    return { id: docRef.id, ...doRelease };
}

export async function getDOReleases(): Promise<DORelease[]> {
    const snapshot = await getDocs(doReleasesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DORelease));
}

export async function updateDORelease(id: string, doRelease: Partial<DORelease>): Promise<void> {
    const doReleaseDoc = doc(db, 'doReleases', id);
    await updateDoc(doReleaseDoc, doRelease);
}

export async function deleteDORelease(id: string): Promise<void> {
    const doReleaseDoc = doc(db, 'doReleases', id);
    await deleteDoc(doReleaseDoc);
}

export async function deleteMultipleDOReleases(ids: string[]): Promise<void> {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const doReleaseDoc = doc(db, 'doReleases', id);
        batch.delete(doReleaseDoc);
    });
    await batch.commit();
}
