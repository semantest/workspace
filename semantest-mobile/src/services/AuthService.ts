import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import type { LoginRequest, LoginResponse, RefreshTokenResponse, User } from '../types/auth';

class AuthServiceClass {
  private baseHeaders = {
    'Content-Type': 'application/json',
  };

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.login}`, {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  async logout(token: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.logout}`, {
        method: 'POST',
        headers: {
          ...this.baseHeaders,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.refresh}`, {
      method: 'POST',
      headers: this.baseHeaders,
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    return response.json();
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.me}`, {
        method: 'GET',
        headers: {
          ...this.baseHeaders,
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.me}`, {
      method: 'GET',
      headers: {
        ...this.baseHeaders,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  }

  async updateProfile(token: string, data: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.userProfile}`, {
      method: 'PATCH',
      headers: {
        ...this.baseHeaders,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  }
}

export const AuthService = new AuthServiceClass();