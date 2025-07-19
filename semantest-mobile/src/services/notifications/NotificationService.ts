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
 * @fileoverview Push Notification Service for Mobile App
 * @author Semantest Team
 * @module services/notifications/NotificationService
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiClient } from '../api/ApiClient';
import { EventEmitter } from 'events';

export interface NotificationConfig {
  enabled: boolean;
  sound: boolean;
  badge: boolean;
  alert: boolean;
  categories: NotificationCategory[];
  schedulingEnabled: boolean;
  maxBadgeCount: number;
}

export interface NotificationCategory {
  id: string;
  name: string;
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  sound?: string;
  vibrationPattern?: number[];
  ledColor?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string | boolean;
  priority?: 'low' | 'normal' | 'high' | 'max';
  categoryId?: string;
  channelId?: string;
  badge?: number;
  icon?: string;
  image?: string;
  actions?: NotificationAction[];
  scheduledFor?: Date;
  repeats?: boolean;
  interval?: number;
}

export interface NotificationAction {
  id: string;
  title: string;
  destructive?: boolean;
  textInput?: boolean;
  textInputPlaceholder?: string;
}

export interface ScheduledNotification {
  id: string;
  payload: NotificationPayload;
  scheduledFor: Date;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  error?: string;
}

export interface NotificationPermissions {
  granted: boolean;
  ios?: {
    allowsAlert: boolean;
    allowsBadge: boolean;
    allowsSound: boolean;
    allowsCriticalAlerts: boolean;
    allowsAnnouncements: boolean;
  };
  android?: {
    importance: number;
    sound: boolean;
    badge: boolean;
    vibrate: boolean;
    lights: boolean;
  };
}

export interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  receivedAt: Date;
  read: boolean;
  category: string;
  priority: string;
  actionTaken?: string;
}

/**
 * Comprehensive push notification service with local and remote capabilities
 */
export class NotificationService extends EventEmitter {
  private config: NotificationConfig;
  private permissionStatus?: NotificationPermissions;
  private deviceToken?: string;
  private notificationHistory: NotificationHistory[] = [];
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();

  constructor(
    private readonly apiClient: ApiClient,
    config?: Partial<NotificationConfig>
  ) {
    super();

    this.config = {
      enabled: true,
      sound: true,
      badge: true,
      alert: true,
      categories: this.getDefaultCategories(),
      schedulingEnabled: true,
      maxBadgeCount: 99,
      ...config
    };

    this.initializeNotifications();
  }

  /**
   * Initialize notification system
   */
  private async initializeNotifications(): Promise<void> {
    try {
      console.log('Initializing notification service');

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          return {
            shouldShowAlert: this.config.alert,
            shouldPlaySound: this.config.sound,
            shouldSetBadge: this.config.badge,
            priority: this.getNotificationPriority(notification)
          };
        },
      });

      // Request permissions
      await this.requestPermissions();

      // Configure notification channels (Android)
      if (Platform.OS === 'android') {
        await this.configureAndroidChannels();
      }

      // Set up notification categories
      await this.configureNotificationCategories();

      // Register for remote notifications
      await this.registerForRemoteNotifications();

      // Set up notification listeners
      this.setupNotificationListeners();

      // Load notification history
      await this.loadNotificationHistory();

      // Load scheduled notifications
      await this.loadScheduledNotifications();

      console.log('Notification service initialized successfully');
      this.emit('initialized');

    } catch (error) {
      console.error('Failed to initialize notification service', { error });
      this.emit('error', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<NotificationPermissions> {
    try {
      if (!Device.isDevice) {
        console.warn('Notifications are not supported in simulator');
        return { granted: false };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: false,
          },
          android: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      const permissions: NotificationPermissions = {
        granted: finalStatus === 'granted'
      };

      if (Platform.OS === 'ios') {
        const iosPermissions = await Notifications.getPermissionsAsync();
        permissions.ios = {
          allowsAlert: iosPermissions.ios?.allowsAlert || false,
          allowsBadge: iosPermissions.ios?.allowsBadge || false,
          allowsSound: iosPermissions.ios?.allowsSound || false,
          allowsCriticalAlerts: iosPermissions.ios?.allowsCriticalAlerts || false,
          allowsAnnouncements: iosPermissions.ios?.allowsAnnouncements || false,
        };
      }

      this.permissionStatus = permissions;
      await this.savePermissionStatus(permissions);

      this.emit('permissionsChanged', permissions);
      return permissions;

    } catch (error) {
      console.error('Failed to request notification permissions', { error });
      throw error;
    }
  }

  /**
   * Send local notification
   */
  async sendNotification(payload: NotificationPayload): Promise<string> {
    try {
      if (!this.config.enabled) {
        console.log('Notifications disabled, skipping');
        return '';
      }

      if (!this.permissionStatus?.granted) {
        console.warn('Notification permissions not granted');
        return '';
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: this.getNotificationSound(payload),
          badge: payload.badge,
          categoryIdentifier: payload.categoryId,
          ...(payload.image && { attachments: [{ url: payload.image }] })
        },
        trigger: payload.scheduledFor ? {
          date: payload.scheduledFor,
          repeats: payload.repeats || false
        } : null,
      });

      // Add to history
      const historyEntry: NotificationHistory = {
        id: notificationId,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        receivedAt: new Date(),
        read: false,
        category: payload.categoryId || 'general',
        priority: payload.priority || 'normal'
      };

      this.notificationHistory.unshift(historyEntry);
      await this.saveNotificationHistory();

      // Update badge count
      if (this.config.badge) {
        await this.updateBadgeCount();
      }

      console.log('Local notification sent', { id: notificationId, title: payload.title });
      this.emit('notificationSent', { id: notificationId, payload });

      return notificationId;

    } catch (error) {
      console.error('Failed to send notification', { error, payload });
      throw error;
    }
  }

  /**
   * Schedule notification for later
   */
  async scheduleNotification(payload: NotificationPayload, scheduledFor: Date): Promise<string> {
    try {
      if (!this.config.schedulingEnabled) {
        throw new Error('Notification scheduling is disabled');
      }

      const scheduledPayload = { ...payload, scheduledFor };
      const notificationId = await this.sendNotification(scheduledPayload);

      // Track scheduled notification
      const scheduledNotification: ScheduledNotification = {
        id: notificationId,
        payload: scheduledPayload,
        scheduledFor,
        status: 'scheduled',
        createdAt: new Date()
      };

      this.scheduledNotifications.set(notificationId, scheduledNotification);
      await this.saveScheduledNotifications();

      console.log('Notification scheduled', { id: notificationId, scheduledFor });
      this.emit('notificationScheduled', scheduledNotification);

      return notificationId;

    } catch (error) {
      console.error('Failed to schedule notification', { error, payload });
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);

      // Update scheduled notification status
      const scheduled = this.scheduledNotifications.get(notificationId);
      if (scheduled) {
        scheduled.status = 'cancelled';
        this.scheduledNotifications.set(notificationId, scheduled);
        await this.saveScheduledNotifications();
      }

      console.log('Notification cancelled', { id: notificationId });
      this.emit('notificationCancelled', notificationId);

    } catch (error) {
      console.error('Failed to cancel notification', { error, notificationId });
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Update all scheduled notification statuses
      for (const [id, notification] of this.scheduledNotifications) {
        notification.status = 'cancelled';
        this.scheduledNotifications.set(id, notification);
      }

      await this.saveScheduledNotifications();

      console.log('All notifications cancelled');
      this.emit('allNotificationsCancelled');

    } catch (error) {
      console.error('Failed to cancel all notifications', { error });
      throw error;
    }
  }

  /**
   * Register for remote push notifications
   */
  private async registerForRemoteNotifications(): Promise<void> {
    try {
      if (!Device.isDevice) {
        console.warn('Remote notifications not supported in simulator');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PROJECT_ID || 'your-project-id'
      });

      this.deviceToken = token.data;
      await AsyncStorage.setItem('push_token', this.deviceToken);

      // Register token with server
      try {
        await this.apiClient.post('/notifications/register', {
          token: this.deviceToken,
          platform: Platform.OS,
          deviceId: await this.getDeviceId()
        });

        console.log('Device registered for remote notifications', { token: this.deviceToken });
        this.emit('tokenRegistered', this.deviceToken);

      } catch (error) {
        console.error('Failed to register token with server', { error });
      }

    } catch (error) {
      console.error('Failed to register for remote notifications', { error });
    }
  }

  /**
   * Configure Android notification channels
   */
  private async configureAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const channels = [
        {
          id: 'default',
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        },
        {
          id: 'test_results',
          name: 'Test Results',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'notification_sound',
        },
        {
          id: 'sync_updates',
          name: 'Sync Updates',
          importance: Notifications.AndroidImportance.LOW,
          vibrationPattern: [0, 250],
        },
        {
          id: 'alerts',
          name: 'Critical Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250, 250, 250],
          sound: 'alert_sound',
        }
      ];

      for (const channel of channels) {
        await Notifications.setNotificationChannelAsync(channel.id, channel);
      }

      console.log('Android notification channels configured');

    } catch (error) {
      console.error('Failed to configure Android channels', { error });
    }
  }

  /**
   * Configure notification categories
   */
  private async configureNotificationCategories(): Promise<void> {
    try {
      const categories = this.config.categories.map(category => ({
        identifier: category.id,
        actions: this.getCategoryActions(category),
        options: {
          categorySummaryFormat: `%u more from ${category.name}`,
          customDismissAction: true,
          allowInCarPlay: true,
          allowAnnouncement: true,
        }
      }));

      await Notifications.setNotificationCategoryAsync(categories[0].identifier, categories[0]);

      console.log('Notification categories configured');

    } catch (error) {
      console.error('Failed to configure notification categories', { error });
    }
  }

  /**
   * Set up notification event listeners
   */
  private setupNotificationListeners(): void {
    // Handle notification received while app is foregrounded
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground', { notification });
      this.handleNotificationReceived(notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received', { response });
      this.handleNotificationResponse(response);
    });

    // Handle notification dropped (Android)
    if (Platform.OS === 'android') {
      Notifications.addNotificationDroppedListener(data => {
        console.warn('Notifications dropped', { count: data.count });
        this.emit('notificationsDropped', data);
      });
    }
  }

  /**
   * Handle notification received
   */
  private handleNotificationReceived(notification: Notifications.Notification): void {
    // Add to history
    const historyEntry: NotificationHistory = {
      id: notification.request.identifier,
      title: notification.request.content.title || '',
      body: notification.request.content.body || '',
      data: notification.request.content.data,
      receivedAt: new Date(),
      read: false,
      category: notification.request.content.categoryIdentifier || 'general',
      priority: 'normal'
    };

    this.notificationHistory.unshift(historyEntry);
    this.saveNotificationHistory();

    // Update badge count
    if (this.config.badge) {
      this.updateBadgeCount();
    }

    this.emit('notificationReceived', notification);
  }

  /**
   * Handle notification response (user interaction)
   */
  private handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const notificationId = response.notification.request.identifier;
    const actionId = response.actionIdentifier;

    // Mark as read
    this.markNotificationAsRead(notificationId);

    // Handle specific actions
    switch (actionId) {
      case 'view_test':
        this.emit('navigateToTest', response.notification.request.content.data);
        break;
      case 'view_results':
        this.emit('navigateToResults', response.notification.request.content.data);
        break;
      case 'sync_now':
        this.emit('triggerSync');
        break;
      case 'dismiss':
        // Just mark as read
        break;
      default:
        this.emit('notificationTapped', response);
    }

    this.emit('notificationResponse', response);
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.actionTaken = 'read';
      await this.saveNotificationHistory();
      this.emit('notificationRead', notificationId);
    }
  }

  /**
   * Update badge count
   */
  private async updateBadgeCount(): Promise<void> {
    try {
      const unreadCount = this.notificationHistory.filter(n => !n.read).length;
      const badgeCount = Math.min(unreadCount, this.config.maxBadgeCount);

      await Notifications.setBadgeCountAsync(badgeCount);
      this.emit('badgeUpdated', badgeCount);

    } catch (error) {
      console.error('Failed to update badge count', { error });
    }
  }

  /**
   * Utility methods
   */
  private getDefaultCategories(): NotificationCategory[] {
    return [
      {
        id: 'test_execution',
        name: 'Test Execution',
        enabled: true,
        priority: 'high',
        sound: 'default'
      },
      {
        id: 'sync_updates',
        name: 'Sync Updates',
        enabled: true,
        priority: 'medium'
      },
      {
        id: 'system_alerts',
        name: 'System Alerts',
        enabled: true,
        priority: 'critical',
        sound: 'alert'
      },
      {
        id: 'general',
        name: 'General',
        enabled: true,
        priority: 'low'
      }
    ];
  }

  private getCategoryActions(category: NotificationCategory): any[] {
    const baseActions = [
      {
        identifier: 'dismiss',
        title: 'Dismiss',
        options: { isDestructive: false }
      }
    ];

    switch (category.id) {
      case 'test_execution':
        return [
          ...baseActions,
          {
            identifier: 'view_results',
            title: 'View Results',
            options: { opensApp: true }
          }
        ];
      case 'sync_updates':
        return [
          ...baseActions,
          {
            identifier: 'sync_now',
            title: 'Sync Now',
            options: { opensApp: true }
          }
        ];
      default:
        return baseActions;
    }
  }

  private getNotificationPriority(notification: Notifications.Notification): Notifications.AndroidImportance {
    const categoryId = notification.request.content.categoryIdentifier;
    const category = this.config.categories.find(c => c.id === categoryId);
    
    switch (category?.priority) {
      case 'critical':
        return Notifications.AndroidImportance.MAX;
      case 'high':
        return Notifications.AndroidImportance.HIGH;
      case 'medium':
        return Notifications.AndroidImportance.DEFAULT;
      case 'low':
        return Notifications.AndroidImportance.LOW;
      default:
        return Notifications.AndroidImportance.DEFAULT;
    }
  }

  private getNotificationSound(payload: NotificationPayload): string | boolean | undefined {
    if (payload.sound !== undefined) {
      return payload.sound;
    }

    if (!this.config.sound) {
      return false;
    }

    const category = this.config.categories.find(c => c.id === payload.categoryId);
    return category?.sound || 'default';
  }

  private async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      return `${Platform.OS}_fallback_${Date.now()}`;
    }
  }

  /**
   * Storage methods
   */
  private async savePermissionStatus(permissions: NotificationPermissions): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_permissions', JSON.stringify(permissions));
    } catch (error) {
      console.error('Failed to save permission status', { error });
    }
  }

  private async loadNotificationHistory(): Promise<void> {
    try {
      const history = await AsyncStorage.getItem('notification_history');
      if (history) {
        this.notificationHistory = JSON.parse(history);
      }
    } catch (error) {
      console.error('Failed to load notification history', { error });
    }
  }

  private async saveNotificationHistory(): Promise<void> {
    try {
      // Keep only last 100 notifications
      const recentHistory = this.notificationHistory.slice(0, 100);
      await AsyncStorage.setItem('notification_history', JSON.stringify(recentHistory));
      this.notificationHistory = recentHistory;
    } catch (error) {
      console.error('Failed to save notification history', { error });
    }
  }

  private async loadScheduledNotifications(): Promise<void> {
    try {
      const scheduled = await AsyncStorage.getItem('scheduled_notifications');
      if (scheduled) {
        const scheduledArray = JSON.parse(scheduled);
        this.scheduledNotifications = new Map(scheduledArray);
      }
    } catch (error) {
      console.error('Failed to load scheduled notifications', { error });
    }
  }

  private async saveScheduledNotifications(): Promise<void> {
    try {
      const scheduledArray = Array.from(this.scheduledNotifications.entries());
      await AsyncStorage.setItem('scheduled_notifications', JSON.stringify(scheduledArray));
    } catch (error) {
      console.error('Failed to save scheduled notifications', { error });
    }
  }

  /**
   * Public API methods
   */
  getPermissions(): NotificationPermissions | undefined {
    return this.permissionStatus;
  }

  getNotificationHistory(): NotificationHistory[] {
    return [...this.notificationHistory];
  }

  getUnreadNotifications(): NotificationHistory[] {
    return this.notificationHistory.filter(n => !n.read);
  }

  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values());
  }

  async clearNotificationHistory(): Promise<void> {
    this.notificationHistory = [];
    await AsyncStorage.removeItem('notification_history');
    await Notifications.setBadgeCountAsync(0);
    this.emit('historyCleared');
  }

  async markAllAsRead(): Promise<void> {
    this.notificationHistory.forEach(n => n.read = true);
    await this.saveNotificationHistory();
    await Notifications.setBadgeCountAsync(0);
    this.emit('allMarkedAsRead');
  }

  updateConfig(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  async unregisterDevice(): Promise<void> {
    try {
      if (this.deviceToken) {
        await this.apiClient.post('/notifications/unregister', {
          token: this.deviceToken
        });
      }

      await AsyncStorage.removeItem('push_token');
      this.deviceToken = undefined;

      console.log('Device unregistered from remote notifications');
      this.emit('tokenUnregistered');

    } catch (error) {
      console.error('Failed to unregister device', { error });
      throw error;
    }
  }

  getDeviceToken(): string | undefined {
    return this.deviceToken;
  }
}