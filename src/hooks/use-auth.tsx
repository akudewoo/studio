
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { hardcodedUsers } from '@/lib/data';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This check ensures sessionStorage is only accessed on the client side
    if (typeof window !== 'undefined') {
      try {
        const storedUser = sessionStorage.getItem('app-user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Could not parse user from sessionStorage', e);
        sessionStorage.removeItem('app-user');
      } finally {
        setLoading(false);
      }
    } else {
        setLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string) => {
    const foundUser = hardcodedUsers.find(
      (u) => u.username === username && u.password === pass
    );

    if (foundUser) {
      const { password, ...userToStore } = foundUser; // Don't store password
      setUser(userToStore);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('app-user', JSON.stringify(userToStore));
      }
      router.push('/dashboard');
    } else {
      throw new Error('Username atau password salah.');
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('app-user');
    }
    router.push('/login');
  };
  
  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
