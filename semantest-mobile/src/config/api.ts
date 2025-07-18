import { Platform } from 'react-native';

// API configuration
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'ios'
    ? 'http://localhost:3000/api'
    : 'http://10.0.2.2:3000/api' // Android emulator
  : 'https://api.semantest.com/api';

export const WS_BASE_URL = __DEV__
  ? Platform.OS === 'ios'
    ? 'ws://localhost:3000'
    : 'ws://10.0.2.2:3000' // Android emulator
  : 'wss://api.semantest.com';

export const API_TIMEOUT = 30000; // 30 seconds

export const API_ENDPOINTS = {
  // Auth
  login: '/auth/login',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  me: '/auth/me',
  
  // Tests
  tests: '/tests',
  testRun: '/tests/run',
  testResults: '/tests/results',
  
  // Projects
  projects: '/projects',
  projectTests: '/projects/:id/tests',
  
  // Users
  users: '/users',
  userProfile: '/users/profile',
  
  // Notifications
  notificationRegister: '/notifications/register',
  notificationSettings: '/notifications/settings',
} as const;