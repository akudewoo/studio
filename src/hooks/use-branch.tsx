
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
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | { id: string, name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const allBranchesOption = { id: ALL_BRANCHES_ID, name: ALL_BRANCHES_NAME };

  useEffect(() => {
    const fetchBranchesAndSetState = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const branchData = await getBranches();
        setBranches(branchData);

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
            setActiveBranchState(assignedBranch || null); // Admin must have an assigned branch
        }
      } catch (error) {
        console.error("Failed to fetch branches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBranchesAndSetState();
  }, [user]);

  const setActiveBranch = (branch: Branch | { id: string, name: string } | null) => {
    setActiveBranchState(branch);
    if (branch && user?.role === 'owner') {
      localStorage.setItem('activeBranchId', branch.id);
    } else if (user?.role === 'owner') {
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
      loading,
      addBranch: handleAddBranch,
      allBranchesOption,
      getBranchName,
    }), [branches, activeBranch, loading, getBranchName]);

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
