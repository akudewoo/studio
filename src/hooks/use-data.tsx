
'use client';

import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useBranch } from './use-branch';
import { useToast } from './use-toast';

import { getKiosks } from '@/services/kioskService';
import { getProducts } from '@/services/productService';
import { getRedemptions } from '@/services/redemptionService';
import { getDOReleases } from '@/services/doReleaseService';
import { getKioskDistributions } from '@/services/kioskDistributionService';
import { getPayments } from '@/services/paymentService';
import { getKasUmum } from '@/services/kasUmumService';
import { getKasAngkutan } from '@/services/kasAngkutanService';

import type { Kiosk, Product, Redemption, DORelease, KioskDistribution, Payment, KasUmum, KasAngkutan } from '@/lib/types';

interface DataState {
  kiosks: Kiosk[];
  products: Product[];
  redemptions: Redemption[];
  doReleases: DORelease[];
  distributions: KioskDistribution[];
  payments: Payment[];
  kasUmum: KasUmum[];
  kasAngkutan: KasAngkutan[];
}

interface DataContextType {
  data: DataState;
  loading: boolean;
  refetchData: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<DataState>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialState: DataState = {
  kiosks: [],
  products: [],
  redemptions: [],
  doReleases: [],
  distributions: [],
  payments: [],
  kasUmum: [],
  kasAngkutan: [],
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeBranch, branches } = useBranch();
  const [data, setData] = useState<DataState>(initialState);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refetchData = useCallback(async () => {
    if (!activeBranch) return;

    setLoading(true);
    setData(initialState); // Clear previous data
    
    try {
       const branchIdsToFetch = activeBranch.id === 'all' 
          ? branches.map(b => b.id)
          : [activeBranch.id];

      const [kiosks, products, redemptions, doReleases, distributions, payments, kasUmum, kasAngkutan] = await Promise.all([
        getKiosks(activeBranch.id),
        getProducts(activeBranch.id),
        getRedemptions(activeBranch.id),
        getDOReleases(activeBranch.id),
        getKioskDistributions(activeBranch.id),
        getPayments(activeBranch.id),
        getKasUmum(branchIdsToFetch),
        getKasAngkutan(activeBranch.id),
      ]);
      setData({ kiosks, products, redemptions, doReleases, distributions, payments, kasUmum, kasAngkutan });
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      toast({
        title: 'Gagal memuat data',
        description: 'Terjadi kesalahan saat memuat data dari database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeBranch, branches, toast]);

  useEffect(() => {
    if (activeBranch) {
        refetchData();
    }
  }, [activeBranch, refetchData]);

  const contextValue = useMemo(() => ({
    data,
    loading,
    refetchData,
    setData,
  }), [data, loading, refetchData]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
