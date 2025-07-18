import { AuthService } from '../../src/services/AuthService';
import * as Keychain from 'react-native-keychain';
import { MMKV } from 'react-native-mmkv';

jest.mock('react-native-keychain');
jest.mock('react-native-mmkv');

describe('AuthService', () => {
  let authService: AuthService;
  let mockStorage: jest.Mocked<MMKV>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = new MMKV() as jest.Mocked<MMKV>;
    authService = new AuthService();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'mock-token',
            refreshToken: 'mock-refresh-token',
            user: { id: '1', email: 'test@example.com' },
          }),
        })
      ) as jest.Mock;

      const keychainSpy = jest.spyOn(Keychain, 'setInternetCredentials');
      
      const result = await authService.login('test@example.com', 'password');

      expect(result.success).toBe(true);
      expect(result.user).toEqual({ id: '1', email: 'test@example.com' });
      expect(keychainSpy).toHaveBeenCalledWith(
        'com.semantest.app',
        'test@example.com',
        'mock-token'
      );
    });

    it('should handle login failure', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid credentials' }),
        })
      ) as jest.Mock;

      const result = await authService.login('test@example.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock;

      const result = await authService.login('test@example.com', 'password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('logout', () => {
    it('should clear credentials on logout', async () => {
      const keychainSpy = jest.spyOn(Keychain, 'resetInternetCredentials');
      mockStorage.delete = jest.fn();

      await authService.logout();

      expect(keychainSpy).toHaveBeenCalledWith('com.semantest.app');
      expect(mockStorage.delete).toHaveBeenCalledWith('auth_token');
      expect(mockStorage.delete).toHaveBeenCalledWith('refresh_token');
      expect(mockStorage.delete).toHaveBeenCalledWith('user');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      mockStorage.getString = jest.fn().mockReturnValue('old-refresh-token');
      
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            token: 'new-token',
            refreshToken: 'new-refresh-token',
          }),
        })
      ) as jest.Mock;

      const result = await authService.refreshToken();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'old-refresh-token' }),
        })
      );
    });

    it('should handle refresh failure', async () => {
      mockStorage.getString = jest.fn().mockReturnValue('old-refresh-token');
      
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
        })
      ) as jest.Mock;

      const result = await authService.refreshToken();

      expect(result).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', async () => {
      jest.spyOn(Keychain, 'getInternetCredentials').mockResolvedValue({
        username: 'test@example.com',
        password: 'mock-token',
        service: 'com.semantest.app',
        storage: 'keychain',
      });

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no token exists', async () => {
      jest.spyOn(Keychain, 'getInternetCredentials').mockResolvedValue(false);

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });
});