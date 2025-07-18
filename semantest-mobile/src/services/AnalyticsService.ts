import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import perf from '@react-native-firebase/perf';
import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';
import DeviceInfo from 'react-native-device-info';

export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
  timestamp?: number;
}

export interface UserProperties {
  userId?: string;
  email?: string;
  plan?: 'free' | 'pro' | 'enterprise';
  createdAt?: string;
  lastActive?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  metadata?: Record<string, any>;
}

export class AnalyticsService {
  private storage = new MMKV({ id: 'analytics' });
  private sessionId: string;
  private isEnabled: boolean = true;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: number | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Check user consent
    this.isEnabled = this.storage.getBoolean('analytics_consent') ?? true;

    // Initialize Firebase services
    await this.setupFirebase();

    // Set default properties
    await this.setDefaultProperties();

    // Start event queue flush
    this.startEventQueueFlush();

    // Track app open
    this.trackEvent('app_open', {
      session_id: this.sessionId,
      source: 'direct',
    });
  }

  private async setupFirebase(): Promise<void> {
    // Enable analytics collection
    await analytics().setAnalyticsCollectionEnabled(this.isEnabled);

    // Enable crashlytics
    await crashlytics().setCrashlyticsCollectionEnabled(this.isEnabled);

    // Set up performance monitoring
    perf().setPerformanceCollectionEnabled(this.isEnabled);
  }

  private async setDefaultProperties(): Promise<void> {
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      device_model: DeviceInfo.getModel(),
      device_brand: DeviceInfo.getBrand(),
      device_id: await DeviceInfo.getUniqueId(),
      app_version: DeviceInfo.getVersion(),
      app_build: DeviceInfo.getBuildNumber(),
      is_tablet: DeviceInfo.isTablet(),
      system_name: DeviceInfo.getSystemName(),
      system_version: DeviceInfo.getSystemVersion(),
    };

    // Set user properties
    await analytics().setUserProperties(deviceInfo);

    // Set crashlytics attributes
    for (const [key, value] of Object.entries(deviceInfo)) {
      crashlytics().setAttribute(key, String(value));
    }
  }

  // Event tracking
  async trackEvent(
    eventName: string,
    parameters?: Record<string, any>
  ): Promise<void> {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      parameters: {
        ...parameters,
        session_id: this.sessionId,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    };

    // Add to queue for batching
    this.eventQueue.push(event);

    // Log to Firebase Analytics
    try {
      await analytics().logEvent(eventName, event.parameters);
    } catch (error) {
      console.error('Failed to track event:', error);
    }

    // Store locally for offline support
    this.storeEventLocally(event);
  }

  // Screen tracking
  async trackScreen(
    screenName: string,
    screenClass?: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });

      // Also track as custom event
      await this.trackEvent('screen_view', {
        screen_name: screenName,
        screen_class: screenClass,
      });
    } catch (error) {
      console.error('Failed to track screen:', error);
    }
  }

  // User identification
  async identifyUser(properties: UserProperties): Promise<void> {
    if (!this.isEnabled) return;

    const { userId, ...userProperties } = properties;

    if (userId) {
      await analytics().setUserId(userId);
      crashlytics().setUserId(userId);
    }

    // Set user properties
    await analytics().setUserProperties(userProperties as any);

    // Set crashlytics attributes
    for (const [key, value] of Object.entries(userProperties)) {
      crashlytics().setAttribute(key, String(value));
    }

    // Track identification event
    await this.trackEvent('user_identified', properties);
  }

  // Performance tracking
  async trackPerformance(metric: PerformanceMetric): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Create custom trace
      const trace = await perf().newTrace(metric.name);
      
      // Add metric
      trace.putMetric('value', metric.value);
      
      // Add metadata as attributes
      if (metric.metadata) {
        for (const [key, value] of Object.entries(metric.metadata)) {
          trace.putAttribute(key, String(value));
        }
      }

      // Stop trace
      await trace.stop();

      // Also log as event
      await this.trackEvent('performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.metadata,
      });
    } catch (error) {
      console.error('Failed to track performance:', error);
    }
  }

  // Crash reporting
  recordError(error: Error, fatal: boolean = false): void {
    if (!this.isEnabled) return;

    crashlytics().recordError(error, error.message);

    if (fatal) {
      crashlytics().crash();
    }

    // Also track as event
    this.trackEvent('error_recorded', {
      error_message: error.message,
      error_stack: error.stack,
      is_fatal: fatal,
    });
  }

  log(message: string): void {
    if (!this.isEnabled) return;
    crashlytics().log(message);
  }

  // Revenue tracking
  async trackRevenue(
    amount: number,
    currency: string,
    productId?: string,
    quantity: number = 1
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.trackEvent('purchase', {
      value: amount,
      currency: currency,
      items: productId ? [{ item_id: productId, quantity }] : undefined,
    });
  }

  // Custom user actions
  async trackAction(
    action: string,
    category: string,
    value?: number,
    label?: string
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.trackEvent('user_action', {
      action,
      category,
      value,
      label,
    });
  }

  // Consent management
  async setAnalyticsConsent(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    this.storage.set('analytics_consent', enabled);

    await analytics().setAnalyticsCollectionEnabled(enabled);
    await crashlytics().setCrashlyticsCollectionEnabled(enabled);
    perf().setPerformanceCollectionEnabled(enabled);

    if (enabled) {
      await this.trackEvent('analytics_enabled');
    }
  }

  // Session management
  startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.trackEvent('session_start', {
      previous_session_duration: this.getSessionDuration(),
    });
  }

  endSession(): void {
    this.trackEvent('session_end', {
      session_duration: this.getSessionDuration(),
    });
    this.flushEventQueue();
  }

  // Helper methods
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionDuration(): number {
    const sessionStart = parseInt(this.sessionId.split('-')[0]);
    return Date.now() - sessionStart;
  }

  private storeEventLocally(event: AnalyticsEvent): void {
    try {
      const events = this.storage.getString('offline_events');
      const eventList = events ? JSON.parse(events) : [];
      eventList.push(event);
      
      // Keep only last 1000 events
      if (eventList.length > 1000) {
        eventList.splice(0, eventList.length - 1000);
      }
      
      this.storage.set('offline_events', JSON.stringify(eventList));
    } catch (error) {
      console.error('Failed to store event locally:', error);
    }
  }

  private startEventQueueFlush(): void {
    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushEventQueue();
    }, 30000) as any;
  }

  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    // In production, this would send to analytics backend
    console.log(`Flushing ${eventsToFlush.length} events`);
  }

  // Debug helpers
  async getDebugInfo(): Promise<Record<string, any>> {
    return {
      session_id: this.sessionId,
      analytics_enabled: this.isEnabled,
      queued_events: this.eventQueue.length,
      device_info: {
        platform: Platform.OS,
        version: Platform.Version,
        model: DeviceInfo.getModel(),
      },
    };
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();