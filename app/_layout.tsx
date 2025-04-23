import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Authentication state
  const [isReady, setIsReady] = useState(false); // Track if the layout is ready
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      setIsReady(true); // Mark the layout as ready
    }
  }, [loaded]);

  useEffect(() => {
    const checkAuthentication = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setIsAuthenticated(true);
          setUserName(userDoc.data().name);
        } else {
          router.replace('/signup'); // Redirect to signup if account does not exist
        }
      } else {
        router.replace('/login'); // Redirect to login if not authenticated
      }
    };

    if (isReady) {
      checkAuthentication();
    }
  }, [isReady]);

  if (!loaded || !isReady) {
    return null; // Wait until the layout is ready
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} /> {/* Add signup page */}
        </Stack>
        <Toast />
      </>
    </ThemeProvider>
  );
}
