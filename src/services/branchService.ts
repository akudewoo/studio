import { collection, addDoc, getDocs, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Branch, BranchInput } from '@/lib/types';

const branchesCollection = collection(db, 'branches');

export async function addBranch(branch: BranchInput): Promise<Branch> {
    const docRef = await addDoc(branchesCollection, branch);
    return { id: docRef.id, ...branch };
}

export async function getBranches(): Promise<Branch[]> {
    const snapshot = await getDocs(branchesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
}
