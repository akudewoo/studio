
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Branch, BranchInput } from '@/lib/types';
import { hardcodedBranches } from '@/lib/data'; // Import hardcoded data

const branchesCollection = collection(db, 'branches');

export async function addBranch(branch: BranchInput): Promise<Branch> {
    // This part can be used if you decide to add branches dynamically later
    const docRef = await addDoc(branchesCollection, branch);
    return { id: docRef.id, ...branch };
}

export async function getBranches(): Promise<Branch[]> {
    // For now, we return the hardcoded branches.
    // This allows the rest of the app to function as if it's fetching from a database.
    return Promise.resolve(hardcodedBranches);
}
