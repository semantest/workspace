import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './navigation/RootNavigator';
import { useAuthStore } from './stores/authStore';
import { NotificationService } from './services/NotificationService';
import { SyncService } from './services/SyncService';
import { ThemeProvider } from './contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Initialize services
    NotificationService.initialize();
    SyncService.initialize();
    
    // Initialize authentication
    initializeAuth();
  }, [initializeAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <NavigationContainer>
              <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent
              />
              <RootNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;