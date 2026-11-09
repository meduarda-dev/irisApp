import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { darkTheme, fontScales, lightTheme, type AppTheme, type FontScale, type FontSizeKey } from '../app/theme/colors';

const STORAGE_DARK = '@iris_dark_mode';
const STORAGE_FONT = '@iris_font_size';
const STORAGE_SPEECH_RATE = '@iris_speech_rate';

export type SpeechRateKey = 'lenta' | 'normal' | 'rapida' | 'veloz';
export const speechRates: Record<SpeechRateKey, number> = {
  lenta: 0.7,
  normal: 1.0,
  rapida: 1.3,
  veloz: 1.6,
};

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  fontSizeKey: FontSizeKey;
  fs: FontScale;
  setFontSize: (key: FontSizeKey) => void;
  speechRateKey: SpeechRateKey;
  setSpeechRate: (key: SpeechRateKey) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  isDark: true,
  toggleTheme: () => {},
  fontSizeKey: 'grande',
  fs: fontScales.grande,
  setFontSize: () => {},
  speechRateKey: 'normal',
  setSpeechRate: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [fontSizeKey, setFontSizeKey] = useState<FontSizeKey>('grande');
  const [speechRateKey, setSpeechRateKey] = useState<SpeechRateKey>('normal');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_DARK),
      AsyncStorage.getItem(STORAGE_FONT),
      AsyncStorage.getItem(STORAGE_SPEECH_RATE),
    ])
      .then(([dark, font, rate]) => {
        if (dark !== null) setIsDark(dark === 'true');
        if (font === 'medio' || font === 'grande' || font === 'extra') setFontSizeKey(font);
        if (rate === 'lenta' || rate === 'normal' || rate === 'rapida' || rate === 'veloz') setSpeechRateKey(rate);
      })
      .catch(() => { /* mantém defaults */ });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_DARK, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const setFontSize = useCallback((key: FontSizeKey) => {
    setFontSizeKey(key);
    AsyncStorage.setItem(STORAGE_FONT, key).catch(() => {});
  }, []);

  const setSpeechRate = useCallback((key: SpeechRateKey) => {
    setSpeechRateKey(key);
    AsyncStorage.setItem(STORAGE_SPEECH_RATE, key).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme: isDark ? darkTheme : lightTheme,
      isDark,
      toggleTheme,
      fontSizeKey,
      fs: fontScales[fontSizeKey],
      setFontSize,
      speechRateKey,
      setSpeechRate,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
