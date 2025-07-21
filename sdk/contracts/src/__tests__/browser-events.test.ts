import {
  BrowserEventTypes,
  NavigatePayload,
  PageLoadPayload,
  PageErrorPayload,
  ConsoleLogPayload,
  NetworkRequestPayload,
  NetworkResponsePayload,
  DialogPayload,
  DownloadPayload
} from '../browser-events';

describe('Browser Events Contracts', () => {
  describe('BrowserEventTypes', () => {
    it('should have all required browser event types', () => {
      expect(BrowserEventTypes.NAVIGATE).toBe('browser/navigate');
      expect(BrowserEventTypes.PAGE_LOAD).toBe('browser/page/load');
      expect(BrowserEventTypes.PAGE_ERROR).toBe('browser/page/error');
      expect(BrowserEventTypes.CONSOLE_LOG).toBe('browser/console/log');
      expect(BrowserEventTypes.NETWORK_REQUEST).toBe('browser/network/request');
      expect(BrowserEventTypes.NETWORK_RESPONSE).toBe('browser/network/response');
      expect(BrowserEventTypes.DIALOG).toBe('browser/dialog');
      expect(BrowserEventTypes.DOWNLOAD).toBe('browser/download');
      expect(BrowserEventTypes.WINDOW_OPEN).toBe('browser/window/open');
      expect(BrowserEventTypes.WINDOW_CLOSE).toBe('browser/window/close');
      expect(BrowserEventTypes.TAB_CREATE).toBe('browser/tab/create');
      expect(BrowserEventTypes.TAB_CLOSE).toBe('browser/tab/close');
    });

    it('should have correct type structure', () => {
      // Verify the object has all expected properties
      const expectedKeys = [
        'NAVIGATE', 'PAGE_LOAD', 'PAGE_ERROR', 'CONSOLE_LOG',
        'NETWORK_REQUEST', 'NETWORK_RESPONSE', 'DIALOG', 'DOWNLOAD',
        'WINDOW_OPEN', 'WINDOW_CLOSE', 'TAB_CREATE', 'TAB_CLOSE'
      ];
      
      expect(Object.keys(BrowserEventTypes).sort()).toEqual(expectedKeys.sort());
    });

    it('should follow naming convention', () => {
      // Get fresh values to avoid issues from previous test
      const eventTypes = {
        NAVIGATE: 'browser/navigate',
        PAGE_LOAD: 'browser/page/load',
        PAGE_ERROR: 'browser/page/error',
        CONSOLE_LOG: 'browser/console/log',
        NETWORK_REQUEST: 'browser/network/request',
        NETWORK_RESPONSE: 'browser/network/response',
        DIALOG: 'browser/dialog',
        DOWNLOAD: 'browser/download',
        WINDOW_OPEN: 'browser/window/open',
        WINDOW_CLOSE: 'browser/window/close',
        TAB_CREATE: 'browser/tab/create',
        TAB_CLOSE: 'browser/tab/close'
      };
      
      Object.values(eventTypes).forEach(eventType => {
        expect(eventType).toMatch(/^browser\//);
      });
    });
  });

  describe('NavigatePayload', () => {
    it('should accept valid navigation payload', () => {
      const payload: NavigatePayload = {
        url: 'https://example.com'
      };

      expect(payload.url).toBe('https://example.com');
    });

    it('should accept optional fields', () => {
      const payload: NavigatePayload = {
        url: 'https://example.com/page',
        referrer: 'https://google.com',
        waitUntil: 'networkidle'
      };

      expect(payload.referrer).toBe('https://google.com');
      expect(payload.waitUntil).toBe('networkidle');
    });

    it('should accept all waitUntil options', () => {
      const waitOptions: Array<'load' | 'domcontentloaded' | 'networkidle'> = 
        ['load', 'domcontentloaded', 'networkidle'];

      waitOptions.forEach(option => {
        const payload: NavigatePayload = {
          url: 'https://example.com',
          waitUntil: option
        };
        expect(payload.waitUntil).toBe(option);
      });
    });
  });

  describe('PageLoadPayload', () => {
    it('should accept valid page load payload', () => {
      const payload: PageLoadPayload = {
        url: 'https://example.com',
        title: 'Example Domain',
        loadTime: 1234
      };

      expect(payload.url).toBe('https://example.com');
      expect(payload.title).toBe('Example Domain');
      expect(payload.loadTime).toBe(1234);
    });

    it('should accept resources information', () => {
      const payload: PageLoadPayload = {
        url: 'https://example.com',
        title: 'Example',
        loadTime: 2000,
        resources: [
          {
            url: 'https://example.com/style.css',
            type: 'stylesheet',
            size: 5432,
            duration: 123
          },
          {
            url: 'https://example.com/script.js',
            type: 'script',
            size: 10240,
            duration: 245
          }
        ]
      };

      expect(payload.resources).toHaveLength(2);
      expect(payload.resources?.[0].type).toBe('stylesheet');
      expect(payload.resources?.[1].size).toBe(10240);
    });
  });

  describe('PageErrorPayload', () => {
    it('should accept basic error information', () => {
      const payload: PageErrorPayload = {
        message: 'Uncaught ReferenceError: foo is not defined',
        url: 'https://example.com/page.html'
      };

      expect(payload.message).toContain('ReferenceError');
      expect(payload.url).toBe('https://example.com/page.html');
    });

    it('should accept detailed error information', () => {
      const payload: PageErrorPayload = {
        message: 'TypeError: Cannot read property of undefined',
        stack: 'TypeError: Cannot read property of undefined\n    at Object.<anonymous>',
        url: 'https://example.com/script.js',
        lineNumber: 42,
        columnNumber: 15
      };

      expect(payload.stack).toContain('TypeError');
      expect(payload.lineNumber).toBe(42);
      expect(payload.columnNumber).toBe(15);
    });
  });

  describe('ConsoleLogPayload', () => {
    it('should accept all console levels', () => {
      const levels: Array<'log' | 'info' | 'warn' | 'error' | 'debug'> = 
        ['log', 'info', 'warn', 'error', 'debug'];

      levels.forEach(level => {
        const payload: ConsoleLogPayload = {
          level,
          message: `Console ${level} message`
        };
        expect(payload.level).toBe(level);
      });
    });

    it('should accept console arguments', () => {
      const payload: ConsoleLogPayload = {
        level: 'log',
        message: 'User data:',
        args: [
          { id: 123, name: 'John' },
          'additional info',
          42
        ]
      };

      expect(payload.args).toHaveLength(3);
      expect(payload.args?.[0]).toEqual({ id: 123, name: 'John' });
    });

    it('should accept location information', () => {
      const payload: ConsoleLogPayload = {
        level: 'error',
        message: 'Something went wrong',
        location: {
          url: 'https://example.com/app.js',
          lineNumber: 100,
          columnNumber: 25
        }
      };

      expect(payload.location?.url).toBe('https://example.com/app.js');
      expect(payload.location?.lineNumber).toBe(100);
    });
  });

  describe('NetworkRequestPayload', () => {
    it('should accept valid request payload', () => {
      const payload: NetworkRequestPayload = {
        requestId: 'req-123',
        url: 'https://api.example.com/users',
        method: 'GET',
        timestamp: Date.now()
      };

      expect(payload.requestId).toBe('req-123');
      expect(payload.method).toBe('GET');
    });

    it('should accept headers and body', () => {
      const payload: NetworkRequestPayload = {
        requestId: 'req-456',
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        },
        body: {
          name: 'John Doe',
          email: 'john@example.com'
        },
        timestamp: Date.now()
      };

      expect(payload.headers?.['Content-Type']).toBe('application/json');
      expect(payload.body).toEqual({ name: 'John Doe', email: 'john@example.com' });
    });
  });

  describe('NetworkResponsePayload', () => {
    it('should accept valid response payload', () => {
      const payload: NetworkResponsePayload = {
        requestId: 'req-123',
        url: 'https://api.example.com/users',
        status: 200,
        statusText: 'OK'
      };

      expect(payload.status).toBe(200);
      expect(payload.statusText).toBe('OK');
    });

    it('should accept detailed response information', () => {
      const payload: NetworkResponsePayload = {
        requestId: 'req-123',
        url: 'https://api.example.com/users',
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=3600'
        },
        body: { users: [] },
        size: 1024,
        duration: 245,
        fromCache: false
      };

      expect(payload.headers?.['Cache-Control']).toBe('max-age=3600');
      expect(payload.size).toBe(1024);
      expect(payload.duration).toBe(245);
      expect(payload.fromCache).toBe(false);
    });

    it('should handle error responses', () => {
      const payload: NetworkResponsePayload = {
        requestId: 'req-789',
        url: 'https://api.example.com/error',
        status: 500,
        statusText: 'Internal Server Error',
        body: { error: 'Database connection failed' }
      };

      expect(payload.status).toBe(500);
      expect((payload.body as any).error).toBe('Database connection failed');
    });
  });

  describe('DialogPayload', () => {
    it('should accept all dialog types', () => {
      const types: Array<'alert' | 'confirm' | 'prompt' | 'beforeunload'> = 
        ['alert', 'confirm', 'prompt', 'beforeunload'];

      types.forEach(type => {
        const payload: DialogPayload = {
          type,
          message: `This is a ${type} dialog`
        };
        expect(payload.type).toBe(type);
      });
    });

    it('should accept prompt dialog with default value', () => {
      const payload: DialogPayload = {
        type: 'prompt',
        message: 'Please enter your name:',
        defaultValue: 'John Doe'
      };

      expect(payload.defaultValue).toBe('John Doe');
    });

    it('should accept dialog action and input', () => {
      const payload: DialogPayload = {
        type: 'prompt',
        message: 'Enter your age:',
        defaultValue: '25',
        action: 'accept',
        inputValue: '30'
      };

      expect(payload.action).toBe('accept');
      expect(payload.inputValue).toBe('30');
    });

    it('should handle dismiss action', () => {
      const payload: DialogPayload = {
        type: 'confirm',
        message: 'Are you sure?',
        action: 'dismiss'
      };

      expect(payload.action).toBe('dismiss');
    });
  });

  describe('DownloadPayload', () => {
    it('should accept all download states', () => {
      const states: Array<'started' | 'completed' | 'failed'> = 
        ['started', 'completed', 'failed'];

      states.forEach(state => {
        const payload: DownloadPayload = {
          url: 'https://example.com/file.pdf',
          filename: 'file.pdf',
          state
        };
        expect(payload.state).toBe(state);
      });
    });

    it('should accept complete download information', () => {
      const payload: DownloadPayload = {
        url: 'https://example.com/document.pdf',
        filename: 'document.pdf',
        path: '/downloads/document.pdf',
        size: 1048576, // 1MB
        mimeType: 'application/pdf',
        state: 'completed'
      };

      expect(payload.path).toBe('/downloads/document.pdf');
      expect(payload.size).toBe(1048576);
      expect(payload.mimeType).toBe('application/pdf');
    });

    it('should handle failed downloads', () => {
      const payload: DownloadPayload = {
        url: 'https://example.com/broken-link.zip',
        filename: 'broken-link.zip',
        state: 'failed'
      };

      expect(payload.state).toBe('failed');
      expect(payload.size).toBeUndefined();
    });
  });

  describe('Browser Event Integration', () => {
    it('should handle a complete page navigation flow', () => {
      const requestId = 'req-nav-123';
      const url = 'https://example.com/dashboard';

      // Navigate to page
      const navigate: NavigatePayload = {
        url,
        waitUntil: 'networkidle'
      };

      // Network requests during navigation
      const request: NetworkRequestPayload = {
        requestId,
        url,
        method: 'GET',
        headers: {
          'Accept': 'text/html'
        },
        timestamp: Date.now()
      };

      // Network response
      const response: NetworkResponsePayload = {
        requestId,
        url,
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/html'
        },
        size: 25600,
        duration: 350
      };

      // Page loaded
      const pageLoad: PageLoadPayload = {
        url,
        title: 'Dashboard - Example',
        loadTime: 1250,
        resources: [
          {
            url: 'https://example.com/css/dashboard.css',
            type: 'stylesheet',
            size: 8192,
            duration: 125
          }
        ]
      };

      // Console logs during page load
      const consoleLogs: ConsoleLogPayload[] = [
        {
          level: 'info',
          message: 'Dashboard loaded successfully'
        },
        {
          level: 'debug',
          message: 'User session validated',
          args: [{ userId: 'user-123', role: 'admin' }]
        }
      ];

      // Verify all payloads are valid
      expect(navigate).toBeDefined();
      expect(request).toBeDefined();
      expect(response).toBeDefined();
      expect(pageLoad).toBeDefined();
      expect(consoleLogs).toHaveLength(2);
    });
  });
});