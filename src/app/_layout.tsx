import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { TccProvider } from '../context/TccContext';
import { ThemeProvider } from '../context/ThemeContext';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider>
      <TccProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </TccProvider>
    </ThemeProvider>
  );
}
