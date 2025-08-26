
import type { AppUser, Branch } from './types';

// Hardcoded branches
export const hardcodedBranches: Branch[] = [
    { id: 'magetan-01', name: 'MAGETAN' },
    { id: 'sragen-02', name: 'SRAGEN' }
];

// Hardcoded users
export const hardcodedUsers = [
    { 
      uid: 'user-owner-001',
      username: 'Owner', 
      password: 'Owner', 
      role: 'owner' as const
    },
    { 
      uid: 'user-admin-001',
      username: 'tmmagetan', 
      password: 'tmmagetan', 
      role: 'admin' as const, 
      branchId: 'magetan-01',
      branchName: 'MAGETAN'
    },
    { 
      uid: 'user-admin-002',
      username: 'tmsragen', 
      password: 'tmsragen', 
      role: 'admin' as const, 
      branchId: 'sragen-02',
      branchName: 'SRAGEN'
    }
];
