import PushNotification, { PushNotificationObject } from 'react-native-push-notification';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

export class NotificationService {
  private static instance: NotificationService;
  private deviceToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  static initialize(): void {
    const instance = NotificationService.getInstance();
    instance.setup();
  }

  private setup(): void {
    // Configure push notifications
    PushNotification.configure({
      onRegister: (token) => {
        console.log('Push notification token:', token);
        this.deviceToken = token.token;
        this.registerDeviceToken(token.token);
      },

      onNotification: async (notification) => {
        console.log('Notification received:', notification);
        
        // Handle notification based on app state
        if (notification.foreground) {
          // Show in-app notification
          await this.showInAppNotification(notification);
        }
        
        // Required on iOS
        notification.finish('backgroundFetchResultNoData');
      },

      onAction: (notification) => {
        console.log('Notification action:', notification.action);
        this.handleNotificationAction(notification);
      },

      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android') {
      this.createNotificationChannels();
    }

    // Setup notifee for advanced notifications
    this.setupNotifee();
  }

  private async createNotificationChannels(): Promise<void> {
    PushNotification.createChannel(
      {
        channelId: 'test-results',
        channelName: 'Test Results',
        channelDescription: 'Notifications for test execution results',
        playSound: true,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Channel 'test-results' created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'test-failures',
        channelName: 'Test Failures',
        channelDescription: 'Critical notifications for test failures',
        playSound: true,
        soundName: 'default',
        importance: 5,
        vibrate: true,
      },
      (created) => console.log(`Channel 'test-failures' created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'reminders',
        channelName: 'Reminders',
        channelDescription: 'Test scheduling reminders',
        playSound: true,
        soundName: 'default',
        importance: 3,
        vibrate: true,
      },
      (created) => console.log(`Channel 'reminders' created: ${created}`)
    );
  }

  private async setupNotifee(): Promise<void> {
    // Request permissions
    await notifee.requestPermission();

    // Create channels for Android
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'important',
        name: 'Important Notifications',
        importance: AndroidImportance.HIGH,
      });
    }

    // Handle notification events
    notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.DISMISSED:
          console.log('User dismissed notification', detail.notification);
          break;
        case EventType.PRESS:
          console.log('User pressed notification', detail.notification);
          this.handleNotificationPress(detail.notification);
          break;
      }
    });
  }

  private async registerDeviceToken(token: string): Promise<void> {
    try {
      // Register device token with backend
      const response = await fetch(`${API_BASE_URL}/notifications/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceInfo: {
            os: Platform.OS,
            version: Platform.Version,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device token');
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  }

  private async showInAppNotification(notification: PushNotificationObject): Promise<void> {
    await notifee.displayNotification({
      title: notification.title || 'Semantest',
      body: notification.message || '',
      android: {
        channelId: 'important',
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    });
  }

  private handleNotificationAction(notification: PushNotificationObject): void {
    // Handle different notification actions
    switch (notification.action) {
      case 'view_results':
        // Navigate to test results
        break;
      case 'retry_test':
        // Trigger test retry
        break;
      default:
        // Default action
        break;
    }
  }

  private handleNotificationPress(notification: any): void {
    // Handle notification press based on data
    if (notification.data) {
      const { type, id } = notification.data;
      switch (type) {
        case 'test_complete':
          // Navigate to test results
          break;
        case 'test_failed':
          // Navigate to failure details
          break;
        case 'reminder':
          // Navigate to test scheduling
          break;
      }
    }
  }

  // Public methods for sending local notifications
  public async scheduleTestReminder(testId: string, scheduledTime: Date): Promise<void> {
    PushNotification.localNotificationSchedule({
      channelId: 'reminders',
      title: 'Test Reminder',
      message: 'Your scheduled test is about to start',
      date: scheduledTime,
      userInfo: { testId, type: 'reminder' },
    });
  }

  public async notifyTestComplete(testId: string, passed: boolean, summary: string): Promise<void> {
    const channelId = passed ? 'test-results' : 'test-failures';
    const title = passed ? 'Test Passed' : 'Test Failed';

    PushNotification.localNotification({
      channelId,
      title,
      message: summary,
      userInfo: { testId, type: 'test_complete', passed },
      actions: passed ? ['View Results'] : ['View Results', 'Retry Test'],
    });
  }

  public async clearAllNotifications(): Promise<void> {
    PushNotification.cancelAllLocalNotifications();
    await notifee.cancelAllNotifications();
  }

  public getDeviceToken(): string | null {
    return this.deviceToken;
  }
}