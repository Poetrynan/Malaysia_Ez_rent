'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Lang, TranslationKey } from './i18n';

interface ThemeContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedLang = (localStorage.getItem('ez_lang') as Lang) || 'zh';
    const savedTheme = (localStorage.getItem('ez_theme') as 'dark' | 'light') || 'dark';
    setLangState(savedLang);
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Migration: fix wrong community coordinates in localStorage if they exist
    try {
      const stored = localStorage.getItem('ez_communities');
      if (stored) {
        const comms = JSON.parse(stored);
        let updated = false;
        const newComms = comms.map((c: any) => {
          if (c.name === 'Sunway Geo Residences' && (c.lat !== 3.06341 || c.lng !== 101.60977)) {
            updated = true;
            return { ...c, lat: 3.06341, lng: 101.60977 };
          }
          if (c.name === 'Nadayu 28 Residences' && (c.lat !== 3.0698 || c.lng !== 101.6040)) {
            updated = true;
            return { ...c, lat: 3.0698, lng: 101.6040 };
          }
          if (c.name === "D'Latour Luxury Suites" && (c.lat !== 3.0593 || c.lng !== 101.6160)) {
            updated = true;
            return { ...c, lat: 3.0593, lng: 101.6160 };
          }
          return c;
        });
        if (updated) {
          localStorage.setItem('ez_communities', JSON.stringify(newComms));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('ez_lang', l);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('ez_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  return (
    <ThemeContext.Provider value={{ lang, setLang, t, theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useApp must be inside ThemeProvider');
  return ctx;
}
