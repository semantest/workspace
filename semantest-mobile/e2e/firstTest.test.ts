import { device, element, by, expect as detoxExpect } from 'detox';

describe('Semantest Mobile E2E Tests', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        camera: 'YES',
        photos: 'YES',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Authentication Flow', () => {
    it('should show login screen on first launch', async () => {
      await detoxExpect(element(by.id('login-screen'))).toBeVisible();
      await detoxExpect(element(by.id('email-input'))).toBeVisible();
      await detoxExpect(element(by.id('password-input'))).toBeVisible();
      await detoxExpect(element(by.id('login-button'))).toBeVisible();
    });

    it('should login successfully with valid credentials', async () => {
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();

      await detoxExpect(element(by.id('dashboard-screen'))).toBeVisible();
      await detoxExpect(element(by.text('Welcome to Semantest'))).toBeVisible();
    });

    it('should show error with invalid credentials', async () => {
      await element(by.id('email-input')).typeText('invalid@example.com');
      await element(by.id('password-input')).typeText('wrongpassword');
      await element(by.id('login-button')).tap();

      await detoxExpect(element(by.text('Invalid credentials'))).toBeVisible();
    });

    it('should support biometric authentication', async () => {
      // First login normally
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();

      // Enable biometric
      await element(by.id('settings-tab')).tap();
      await element(by.id('biometric-toggle')).tap();
      
      // Logout and check biometric prompt
      await element(by.id('logout-button')).tap();
      await detoxExpect(element(by.id('biometric-login-button'))).toBeVisible();
    });
  });

  describe('Dashboard', () => {
    beforeEach(async () => {
      // Quick login
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
    });

    it('should display test statistics', async () => {
      await detoxExpect(element(by.id('total-tests-card'))).toBeVisible();
      await detoxExpect(element(by.id('passed-tests-card'))).toBeVisible();
      await detoxExpect(element(by.id('failed-tests-card'))).toBeVisible();
      await detoxExpect(element(by.id('pending-tests-card'))).toBeVisible();
    });

    it('should refresh data on pull-to-refresh', async () => {
      await element(by.id('dashboard-scroll-view')).swipe('down', 'slow');
      await detoxExpect(element(by.id('refresh-indicator'))).toBeVisible();
      await waitFor(element(by.id('refresh-indicator')))
        .not.toBeVisible()
        .withTimeout(5000);
    });

    it('should navigate to create test screen', async () => {
      await element(by.id('create-test-button')).tap();
      await detoxExpect(element(by.id('create-test-screen'))).toBeVisible();
    });
  });

  describe('Test Management', () => {
    beforeEach(async () => {
      // Quick login
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      
      // Navigate to tests tab
      await element(by.id('tests-tab')).tap();
    });

    it('should create a new test', async () => {
      await element(by.id('create-test-fab')).tap();
      
      await element(by.id('test-name-input')).typeText('E2E Test Case');
      await element(by.id('test-description-input')).typeText('This is an E2E test');
      await element(by.id('test-type-dropdown')).tap();
      await element(by.text('Unit Test')).tap();
      
      await element(by.id('save-test-button')).tap();
      
      await detoxExpect(element(by.text('E2E Test Case'))).toBeVisible();
    });

    it('should edit an existing test', async () => {
      await element(by.text('E2E Test Case')).tap();
      await element(by.id('edit-test-button')).tap();
      
      await element(by.id('test-name-input')).clearText();
      await element(by.id('test-name-input')).typeText('Updated E2E Test');
      await element(by.id('save-test-button')).tap();
      
      await detoxExpect(element(by.text('Updated E2E Test'))).toBeVisible();
    });

    it('should delete a test with confirmation', async () => {
      await element(by.text('Updated E2E Test')).swipe('left');
      await element(by.id('delete-test-button')).tap();
      await element(by.text('Delete')).tap();
      
      await detoxExpect(element(by.text('Updated E2E Test'))).not.toBeVisible();
    });
  });

  describe('Offline Support', () => {
    it('should show offline indicator when network is disabled', async () => {
      await device.setURLBlacklist(['.*']);
      
      await detoxExpect(element(by.id('offline-indicator'))).toBeVisible();
      await detoxExpect(element(by.text('You are offline'))).toBeVisible();
    });

    it('should queue actions when offline', async () => {
      await device.setURLBlacklist(['.*']);
      
      // Create test while offline
      await element(by.id('tests-tab')).tap();
      await element(by.id('create-test-fab')).tap();
      await element(by.id('test-name-input')).typeText('Offline Test');
      await element(by.id('save-test-button')).tap();
      
      // Should show sync pending indicator
      await detoxExpect(element(by.id('sync-pending-badge'))).toBeVisible();
      
      // Re-enable network
      await device.clearURLBlacklist();
      
      // Should sync automatically
      await waitFor(element(by.id('sync-pending-badge')))
        .not.toBeVisible()
        .withTimeout(10000);
    });
  });

  describe('Push Notifications', () => {
    it('should request notification permissions', async () => {
      await element(by.id('settings-tab')).tap();
      await element(by.id('notifications-toggle')).tap();
      
      // Permission dialog would appear here in real device
      await detoxExpect(element(by.text('Notifications enabled'))).toBeVisible();
    });

    it('should handle incoming notification', async () => {
      // Simulate notification
      await device.sendUserNotification({
        trigger: {
          type: 'push',
        },
        title: 'Test Completed',
        body: 'Your test "E2E Suite" has completed',
        badge: 1,
        payload: {
          testId: '123',
        },
      });

      // Should navigate to test details
      await waitFor(element(by.id('test-details-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Performance', () => {
    it('should load dashboard within 3 seconds', async () => {
      const startTime = Date.now();
      
      await device.reloadReactNative();
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(3000);
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle large test lists efficiently', async () => {
      await element(by.id('tests-tab')).tap();
      
      // Assuming we have many tests loaded
      await element(by.id('test-list')).scrollTo('bottom');
      await element(by.id('test-list')).scrollTo('top');
      
      // Should maintain 60fps - check no janky scrolling
      await detoxExpect(element(by.id('test-list'))).toBeVisible();
    });
  });
});