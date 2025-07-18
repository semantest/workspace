import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Keychain from 'react-native-keychain';
import { AuthService } from '../services/AuthService';
import type { User, AuthState } from '../types/auth';

interface AuthStore extends AuthState {
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setBiometricEnabled: (enabled: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      accessToken: null,
      refreshToken: null,
      biometricEnabled: false,

      initialize: async () => {
        try {
          set({ isLoading: true });
          
          // Check for stored credentials
          const credentials = await Keychain.getInternetCredentials('semantest');
          if (credentials) {
            const { username, password } = credentials;
            const tokens = JSON.parse(password);
            
            // Validate tokens
            const isValid = await AuthService.validateToken(tokens.accessToken);
            if (isValid) {
              const user = await AuthService.getCurrentUser(tokens.accessToken);
              set({
                user,
                isAuthenticated: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
              });
            } else {
              // Try to refresh
              await get().refreshToken();
            }
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          
          const response = await AuthService.login(email, password);
          const { user, accessToken, refreshToken } = response;
          
          // Store tokens securely
          await Keychain.setInternetCredentials(
            'semantest',
            email,
            JSON.stringify({ accessToken, refreshToken })
          );
          
          set({
            user,
            isAuthenticated: true,
            accessToken,
            refreshToken,
          });
        } catch (error) {
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          const { accessToken } = get();
          if (accessToken) {
            await AuthService.logout(accessToken);
          }
          
          // Clear stored credentials
          await Keychain.resetInternetCredentials('semantest');
          
          set({
            user: null,
            isAuthenticated: false,
            accessToken: null,
            refreshToken: null,
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
      },

      refreshToken: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) throw new Error('No refresh token');
          
          const response = await AuthService.refreshToken(refreshToken);
          const { accessToken, refreshToken: newRefreshToken } = response;
          
          // Update stored tokens
          const credentials = await Keychain.getInternetCredentials('semantest');
          if (credentials) {
            await Keychain.setInternetCredentials(
              'semantest',
              credentials.username,
              JSON.stringify({ accessToken, refreshToken: newRefreshToken })
            );
          }
          
          set({
            accessToken,
            refreshToken: newRefreshToken,
          });
        } catch (error) {
          // If refresh fails, logout
          await get().logout();
          throw error;
        }
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      setBiometricEnabled: (enabled: boolean) => {
        set({ biometricEnabled: enabled });
      },
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
      partialize: (state) => ({
        biometricEnabled: state.biometricEnabled,
      }),
    }
  )
);