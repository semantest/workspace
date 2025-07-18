export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'developer' | 'tester' | 'viewer';
  organizationId: string;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  language: string;
  timezone: string;
}

export interface NotificationPreferences {
  testComplete: boolean;
  testFailed: boolean;
  mentions: boolean;
  updates: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  biometricEnabled: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}