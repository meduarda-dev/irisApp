import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { darkTheme, fontScales, lightTheme, type AppTheme, type FontScale, type FontSizeKey } from '../app/theme/colors';

const STORAGE_DARK = '@iris_dark_mode';
const STORAGE_FONT = '@iris_font_size';

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  fontSizeKey: FontSizeKey;
  fs: FontScale;
  setFontSize: (key: FontSizeKey) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
  fontSizeKey: 'grande',
  fs: fontScales.grande,
  setFontSize: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [fontSizeKey, setFontSizeKey] = useState<FontSizeKey>('grande'); // grande como default

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_DARK),
      AsyncStorage.getItem(STORAGE_FONT),
    ])
      .then(([dark, font]) => {
        if (dark !== null) setIsDark(dark === 'true');
        if (font === 'medio' || font === 'grande' || font === 'extra') setFontSizeKey(font);
      })
      .catch(() => { /* mantém defaults */ });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_DARK, String(next));
      return next;
    });
  }, []);

  const setFontSize = useCallback((key: FontSizeKey) => {
    setFontSizeKey(key);
    AsyncStorage.setItem(STORAGE_FONT, key);
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme: isDark ? darkTheme : lightTheme,
      isDark,
      toggleTheme,
      fontSizeKey,
      fs: fontScales[fontSizeKey],
      setFontSize,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
