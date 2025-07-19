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
 * @fileoverview API Client for Semantest Mobile App
 * @author Semantest Team
 * @module services/api/ApiClient
 */

import axios, { 
  AxiosInstance, 
  AxiosRequestConfig, 
  AxiosResponse, 
  AxiosError,
  InternalAxiosRequestConfig 
} from 'axios';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { ApiResponse, ApiError, RequestConfig } from './types';
import { OfflineManager } from '../offline/OfflineManager';
import { SyncManager } from '../sync/SyncManager';
import { NetworkStatusService } from '../network/NetworkStatusService';

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableOfflineSupport: boolean;
  enableRequestQueue: boolean;
  enableResponseCaching: boolean;
  cacheExpirationTime: number;
}

/**
 * Default API Configuration
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: __DEV__ ? 'http://localhost:3000/api' : 'https://api.semantest.com',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableOfflineSupport: true,
  enableRequestQueue: true,
  enableResponseCaching: true,
  cacheExpirationTime: 5 * 60 * 1000, // 5 minutes
};

/**
 * API Client Class
 * Handles all HTTP communication with the Semantest platform
 */
export class ApiClient {
  private axiosInstance: AxiosInstance;
  private config: ApiClientConfig;
  private offlineManager: OfflineManager;
  private syncManager: SyncManager;
  private networkStatusService: NetworkStatusService;
  private requestQueue: Map<string, RequestConfig> = new Map();
  private responseCache: Map<string, { data: any; expiry: number }> = new Map();

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.axiosInstance = this.createAxiosInstance();
    this.offlineManager = new OfflineManager();
    this.syncManager = new SyncManager(this);
    this.networkStatusService = new NetworkStatusService();
    
    this.setupInterceptors();
    this.setupNetworkListeners();
    this.startSyncManager();
  }

  /**
   * Create Axios instance with configuration
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Semantest-Mobile/2.0.0',
      },
    });

    return instance;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Add authentication token
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Add device information
        const deviceInfo = await this.getDeviceInfo();
        config.headers['X-Device-Info'] = JSON.stringify(deviceInfo);

        // Check network status
        const networkState = await NetInfo.fetch();
        if (!networkState.isConnected && this.config.enableOfflineSupport) {
          // Queue request for later if offline
          await this.queueRequest(config);
          throw new Error('OFFLINE_MODE');
        }

        return config;
      },
      (error: AxiosError) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(this.handleError(error));
      }
    );

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // Cache successful responses
        if (this.config.enableResponseCaching && this.shouldCacheResponse(response)) {
          this.cacheResponse(response);
        }

        return this.transformResponse(response);
      },
      async (error: AxiosError) => {
        // Handle authentication errors
        if (error.response?.status === 401) {
          await this.handleAuthenticationError();
        }

        // Retry logic for network errors
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    NetInfo.addEventListener(state => {
      if (state.isConnected && this.config.enableRequestQueue) {
        this.processRequestQueue();
      }
    });
  }

  /**
   * Start sync manager
   */
  private startSyncManager(): void {
    if (this.config.enableOfflineSupport) {
      this.syncManager.start();
    }
  }

  /**
   * GET Request
   */
  async get<T>(
    url: string, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Check cache first
      if (this.config.enableResponseCaching) {
        const cached = this.getCachedResponse<T>(url);
        if (cached) {
          return cached;
        }
      }

      const response = await this.axiosInstance.get<T>(url, config);
      return this.transformResponse<T>(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * POST Request
   */
  async post<T>(
    url: string, 
    data?: any, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return this.transformResponse<T>(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * PUT Request
   */
  async put<T>(
    url: string, 
    data?: any, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return this.transformResponse<T>(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * DELETE Request
   */
  async delete<T>(
    url: string, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return this.transformResponse<T>(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Upload file with progress tracking
   */
  async upload<T>(
    url: string,
    file: FormData,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post<T>(url, file, {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(Math.round(progress));
          }
        },
      });
      return this.transformResponse<T>(response);
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Download file with progress tracking
   */
  async download(
    url: string,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<Blob> {
    try {
      const response = await this.axiosInstance.get(url, {
        ...config,
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(Math.round(progress));
          }
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Batch requests
   */
  async batch<T>(
    requests: Array<() => Promise<ApiResponse<any>>>
  ): Promise<ApiResponse<T[]>> {
    try {
      const responses = await Promise.allSettled(
        requests.map(request => request())
      );

      const results: T[] = [];
      const errors: ApiError[] = [];

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          results.push(response.value.data);
        } else {
          errors.push({
            message: `Request ${index} failed: ${response.reason.message}`,
            code: 'BATCH_REQUEST_FAILED',
            statusCode: 500
          });
        }
      });

      return {
        data: results,
        success: errors.length === 0,
        message: errors.length === 0 ? 'All requests successful' : 'Some requests failed',
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Transform axios response to API response format
   */
  private transformResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      success: response.status >= 200 && response.status < 300,
      message: response.statusText,
      statusCode: response.status,
      timestamp: new Date().toISOString(),
      requestId: response.headers['x-request-id'],
    };
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): ApiError {
    const apiError: ApiError = {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      statusCode: error.response?.status || 0,
      timestamp: new Date().toISOString(),
    };

    if (error.response?.data) {
      const responseData = error.response.data as any;
      apiError.message = responseData.message || apiError.message;
      apiError.details = responseData.details;
      apiError.errors = responseData.errors;
    }

    return apiError;
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Set authentication token
   */
  async setAuthToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('auth_token', token);
    } catch (error) {
      console.error('Failed to set auth token:', error);
    }
  }

  /**
   * Clear authentication token
   */
  async clearAuthToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('auth_token');
    } catch (error) {
      console.error('Failed to clear auth token:', error);
    }
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<any> {
    try {
      const deviceInfo = await AsyncStorage.getItem('device_info');
      return deviceInfo ? JSON.parse(deviceInfo) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Queue request for offline processing
   */
  private async queueRequest(config: InternalAxiosRequestConfig): Promise<void> {
    if (!this.config.enableRequestQueue) return;

    const requestId = this.generateRequestId();
    const queuedRequest: RequestConfig = {
      method: config.method as any,
      url: config.url || '',
      data: config.data,
      headers: config.headers as any,
      params: config.params,
      timestamp: Date.now(),
    };

    this.requestQueue.set(requestId, queuedRequest);
    await this.offlineManager.storeQueuedRequest(requestId, queuedRequest);
  }

  /**
   * Process queued requests when back online
   */
  private async processRequestQueue(): Promise<void> {
    const queuedRequests = await this.offlineManager.getQueuedRequests();
    
    for (const [requestId, request] of Object.entries(queuedRequests)) {
      try {
        await this.axiosInstance.request(request);
        await this.offlineManager.removeQueuedRequest(requestId);
        this.requestQueue.delete(requestId);
      } catch (error) {
        console.error('Failed to process queued request:', error);
      }
    }
  }

  /**
   * Cache response
   */
  private cacheResponse(response: AxiosResponse): void {
    const cacheKey = this.getCacheKey(response.config);
    const expiry = Date.now() + this.config.cacheExpirationTime;
    
    this.responseCache.set(cacheKey, {
      data: this.transformResponse(response),
      expiry
    });
  }

  /**
   * Get cached response
   */
  private getCachedResponse<T>(url: string): ApiResponse<T> | null {
    const cacheKey = this.getCacheKey({ url } as any);
    const cached = this.responseCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    if (cached) {
      this.responseCache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Get cache key for request
   */
  private getCacheKey(config: AxiosRequestConfig): string {
    return `${config.method || 'GET'}_${config.url}_${JSON.stringify(config.params || {})}`;
  }

  /**
   * Check if response should be cached
   */
  private shouldCacheResponse(response: AxiosResponse): boolean {
    return response.status === 200 && 
           response.config.method?.toLowerCase() === 'get' &&
           !response.config.url?.includes('/auth/');
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    if (error.config?.headers?.['X-Retry-Count']) {
      const retryCount = parseInt(error.config.headers['X-Retry-Count'] as string);
      return retryCount < this.config.retryAttempts;
    }
    
    // Retry on network errors or 5xx status codes
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }

  /**
   * Retry failed request
   */
  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config!;
    const retryCount = parseInt(config.headers?.['X-Retry-Count'] as string || '0') + 1;
    
    // Wait before retrying
    await new Promise(resolve => 
      setTimeout(resolve, this.config.retryDelay * retryCount)
    );
    
    config.headers = {
      ...config.headers,
      'X-Retry-Count': retryCount.toString()
    };
    
    return this.axiosInstance.request(config);
  }

  /**
   * Handle authentication errors
   */
  private async handleAuthenticationError(): Promise<void> {
    await this.clearAuthToken();
    // Emit event for app to handle logout
    // This would typically be handled by a global event system
  }

  /**
   * Get API client statistics
   */
  getStatistics(): {
    requestQueueSize: number;
    cacheSize: number;
    isOnline: boolean;
  } {
    return {
      requestQueueSize: this.requestQueue.size,
      cacheSize: this.responseCache.size,
      isOnline: this.networkStatusService.isOnline()
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Destroy API client and cleanup resources
   */
  destroy(): void {
    this.syncManager.stop();
    this.networkStatusService.destroy();
    this.clearCache();
    this.requestQueue.clear();
  }
}

// Export singleton instance
export const apiClient = new ApiClient();