import { hardcodedBranches } from '@/lib/data';
import type { Branch, BranchInput } from '@/lib/types';

// Supabase does not have an equivalent of a "no-backend" mode for prototyping.
// For now, we continue to use the hardcoded branches.
// If you want to manage branches in the Supabase database, let me know.

export async function addBranch(branch: BranchInput): Promise<Branch> {
    console.warn("addBranch is not implemented. Using hardcoded data.");
    const newBranch = { id: `new-branch-${Math.random()}`, ...branch };
    hardcodedBranches.push(newBranch);
    return newBranch;
}

export async function getBranches(): Promise<Branch[]> {
    return Promise.resolve(hardcodedBranches);
}
