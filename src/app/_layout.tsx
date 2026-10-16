import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
