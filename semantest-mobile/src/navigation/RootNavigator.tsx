/*
                      @semantest/mobile-app

  Copyright (C) 2025-today  Semantest Team

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * @fileoverview Root Navigator for Semantest Mobile App
 * @author Semantest Team
 * @module navigation/RootNavigator
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { LoadingScreen } from '../screens/common/LoadingScreen';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useAuthStore } from '../stores/authStore';
import { useAppStore } from '../stores/appStore';
import { navigationTheme } from '../theme/navigationTheme';
import { linking } from './linking';

export type RootStackParamList = {
  Loading: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  ErrorBoundary: { error: Error };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Navigator Component
 * Handles app-level navigation and authentication flow
 */
export const RootNavigator: React.FC = () => {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  
  const { isAuthenticated, isLoading: authLoading, initialize: initializeAuth } = useAuthStore();
  const { 
    isFirstLaunch, 
    isLoading: appLoading, 
    initialize: initializeApp,
    hasCompletedOnboarding 
  } = useAppStore();

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    const initializeApplication = async () => {
      try {
        // Initialize app state and authentication
        await Promise.all([
          initializeApp(),
          initializeAuth()
        ]);
        
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize application:', error);
        setIsReady(true); // Still set ready to show error state
      }
    };

    initializeApplication();
  }, [initializeApp, initializeAuth]);

  /**
   * Show loading screen while initializing
   */
  if (!isReady || authLoading || appLoading) {
    return <LoadingScreen />;
  }

  /**
   * Determine initial route based on app state
   */
  const getInitialRouteName = (): keyof RootStackParamList => {
    if (isFirstLaunch || !hasCompletedOnboarding) {
      return 'Onboarding';
    }
    
    if (!isAuthenticated) {
      return 'Auth';
    }
    
    return 'Main';
  };

  return (
    <ErrorBoundary>
      <NavigationContainer
        theme={navigationTheme[colorScheme || 'light']}
        linking={linking}
        onReady={() => console.log('Navigation ready')}
        fallback={<LoadingScreen />}
      >
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        
        <Stack.Navigator
          initialRouteName={getInitialRouteName()}
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen 
            name="Loading" 
            component={LoadingScreen}
            options={{ gestureEnabled: false }}
          />
          
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingNavigator}
            options={{ gestureEnabled: false }}
          />
          
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{ gestureEnabled: false }}
          />
          
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{ gestureEnabled: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
};

export default RootNavigator;