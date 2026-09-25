import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { Slot, SplashScreen, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import {
  useFonts,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { bootstrapAuth } from '../store/authStore';
import { AnimatedSplash } from '../components/brand/AnimatedSplash';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

function useDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    function handleUrl(url: string) {
      // hogarapp://reset-password?code=xxx
      if (url.includes('reset-password')) {
        const code = new URL(url).searchParams.get('code') ?? '';
        router.push(`/reset-password?code=${encodeURIComponent(code)}`);
      }
    }

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); }).catch(() => undefined);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [router]);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });
  const [authReady, setAuthReady] = useState(false);
  // Animación de inicio: solo al abrir la app (no al volver de segundo plano).
  const [showSplash, setShowSplash] = useState(true);

  useDeepLinkHandler();

  useEffect(() => {
    const unsubscribe = bootstrapAuth();
    setAuthReady(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (fontsLoaded && authReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, authReady]);

  if (!fontsLoaded || !authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Android edge-to-edge (SDK 57): sin esto, keyboard-controller añade un relleno
          del alto de la barra de estado y asoma una franja clara arriba. */}
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Slot />
          {showSplash ? <AnimatedSplash onFinish={() => setShowSplash(false)} /> : null}
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
