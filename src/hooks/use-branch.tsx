
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { Branch } from '@/lib/types';
import { getBranches, addBranch } from '@/services/branchService';

interface BranchContextType {
  branches: Branch[];
  activeBranch: Branch | null;
  setActiveBranch: (branch: Branch | null) => void;
  loading: boolean;
  addBranch: (name: string) => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        let branchData = await getBranches();
        if (branchData.length === 0) {
          // Initialize with default branches if none exist
          await Promise.all([
            addBranch({ name: 'MAGETAN' }),
            addBranch({ name: 'SRAGEN' }),
          ]);
          branchData = await getBranches();
        }
        setBranches(branchData);
        
        const storedBranchId = localStorage.getItem('activeBranchId');
        const branchToActivate = branchData.find(b => b.id === storedBranchId) || branchData[0];
        
        if(branchToActivate) {
            setActiveBranchState(branchToActivate);
            localStorage.setItem('activeBranchId', branchToActivate.id);
        }

      } catch (error) {
        console.error("Failed to fetch branches:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  const setActiveBranch = (branch: Branch | null) => {
    setActiveBranchState(branch);
    if (branch) {
      localStorage.setItem('activeBranchId', branch.id);
    } else {
      localStorage.removeItem('activeBranchId');
    }
    // A simple way to trigger a re-fetch in all pages
    window.location.reload();
  };
  
  const handleAddBranch = async (name: string) => {
      const newBranch = await addBranch({ name });
      setBranches(prev => [...prev, newBranch]);
  };

  const value = useMemo(() => ({ branches, activeBranch, setActiveBranch, loading, addBranch: handleAddBranch }), [branches, activeBranch, loading]);

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
