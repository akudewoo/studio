'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type IconType = 'default' | 'package' | 'git-branch' | 'briefcase';

interface Settings {
  appName: string;
  appIcon: IconType;
  primaryColor: string;
  sidebarOpen: boolean;
}

interface SettingsContextType {
  settings: Settings;
  isLoaded: boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  appName: 'AlurDistribusi',
  appIcon: 'default',
  primaryColor: '275 100% 25%',
  sidebarOpen: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
            setSettingsState({ ...defaultSettings, ...JSON.parse(savedSettings) });
        }
    } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('app-settings', JSON.stringify(settings));
      const root = document.documentElement;
      root.style.setProperty('--primary', settings.primaryColor);
      
      const [h, s, l] = settings.primaryColor.split(' ').map(v => parseInt(v, 10));
      const ringColor = `${h} ${s}% ${l}%`;
      root.style.setProperty('--ring', ringColor);
      // You can derive other colors here if needed, e.g., accent
    }
  }, [settings, isLoaded]);

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettingsState((prev) => ({ ...prev, [key]: value }));
  }, []);
  
  const setSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState((prev) => ({...prev, ...newSettings}));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, isLoaded, setSetting, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
