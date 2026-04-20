import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { syncService } from '../services/sync';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  // Start offline sync listener on app boot
  useEffect(() => {
    const unsubscribe = syncService.startListening();
    return () => unsubscribe();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      />
    </AuthProvider>
  );
}
