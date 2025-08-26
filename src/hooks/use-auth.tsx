
'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppUser } from '@/lib/types';
import { hardcodedUsers } from '@/lib/data'; // We will create this file

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
  }, []);

  const login = async (username: string, pass: string) => {
    const foundUser = hardcodedUsers.find(
      (u) => u.username === username && u.password === pass
    );

    if (foundUser) {
      const { password, ...userToStore } = foundUser; // Don't store password
      setUser(userToStore);
      sessionStorage.setItem('app-user', JSON.stringify(userToStore));
      router.push('/dashboard');
    } else {
      throw new Error('Username atau password salah.');
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('app-user');
    router.push('/login');
  };
  
   useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
    if (!loading && user && pathname === '/login') {
       router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
        {loading ? (
             <div className="flex h-screen w-full items-center justify-center">
                <p>Loading...</p>
             </div>
        ) : children}
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
