
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Branch } from '@/lib/types';
import { getBranches, addBranch } from '@/services/branchService';
import { useAuth } from './use-auth';

const ALL_BRANCHES_ID = 'all';
const ALL_BRANCHES_NAME = 'Semua Cabang';

interface BranchContextType {
  branches: Branch[];
  activeBranch: Branch | { id: string, name: string } | null;
  allBranchesOption: { id: string, name: string };
  setActiveBranch: (branch: Branch | { id: string, name: string } | null) => void;
  loading: boolean;
  addBranch: (name: string) => Promise<void>;
  getBranchName: (branchId: string) => string;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | { id: string, name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const allBranchesOption = { id: ALL_BRANCHES_ID, name: ALL_BRANCHES_NAME };

  useEffect(() => {
    const fetchBranchesAndSetState = async () => {
      if (authLoading || !user) return;
      setLoading(true);
      try {
        let branchData = await getBranches();
        if (branchData.length === 0 && user?.role === 'owner') {
          // Initialize with default branches if none exist
          await Promise.all([
            addBranch({ name: 'MAGETAN' }),
            addBranch({ name: 'SRAGEN' }),
          ]);
          branchData = await getBranches();
        }
        setBranches(branchData);

        // Determine the active branch based on user role
        if (user.role === 'owner') {
           const storedBranchId = localStorage.getItem('activeBranchId');
           if (storedBranchId === ALL_BRANCHES_ID) {
              setActiveBranchState(allBranchesOption);
           } else {
             const branchToActivate = branchData.find(b => b.id === storedBranchId) || allBranchesOption;
             setActiveBranchState(branchToActivate);
           }
        } else if (user.role === 'admin' && user.branchId) {
            const assignedBranch = branchData.find(b => b.id === user.branchId);
            // Fallback to the first available branch if assigned one not found
            setActiveBranchState(assignedBranch || branchData[0] || null);
        } else {
            // Default case if something is wrong
            setActiveBranchState(null);
        }

      } catch (error) {
        console.error("Failed to fetch branches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBranchesAndSetState();
  }, [user, authLoading]);

  const setActiveBranch = (branch: Branch | { id: string, name: string } | null) => {
    setActiveBranchState(branch);
    if (branch) {
      localStorage.setItem('activeBranchId', branch.id);
    } else {
      localStorage.removeItem('activeBranchId');
    }
  };
  
  const handleAddBranch = async (name: string) => {
      const newBranch = await addBranch({ name });
      setBranches(prev => [...prev, newBranch]);
  };

  const getBranchName = useCallback((branchId: string) => {
    if (branchId === ALL_BRANCHES_ID) return ALL_BRANCHES_NAME;
    return branches.find(b => b.id === branchId)?.name || 'N/A';
  }, [branches]);


  const value = useMemo(() => ({ 
      branches, 
      activeBranch, 
      setActiveBranch, 
      loading: loading || authLoading, 
      addBranch: handleAddBranch,
      allBranchesOption,
      getBranchName,
    }), [branches, activeBranch, loading, authLoading, getBranchName]);

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
};
