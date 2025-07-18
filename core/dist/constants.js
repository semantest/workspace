"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURE_FLAGS = exports.ENVIRONMENTS = exports.LOG_LEVELS = exports.DATE_FORMATS = exports.API_ENDPOINTS = exports.CHROME_EXTENSION = exports.STORAGE_KEYS = exports.BROWSER = exports.DEFAULTS = exports.REGEX = exports.MIME_TYPES = exports.FILE_EXTENSIONS = exports.BROWSER_SELECTORS = exports.ERROR_CODES = exports.EVENTS = exports.HEADERS = exports.CONTENT_TYPES = exports.HTTP_METHODS = exports.HTTP_STATUS = void 0;
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};
exports.HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH',
    HEAD: 'HEAD',
    OPTIONS: 'OPTIONS'
};
exports.CONTENT_TYPES = {
    JSON: 'application/json',
    XML: 'application/xml',
    HTML: 'text/html',
    TEXT: 'text/plain',
    FORM_DATA: 'multipart/form-data',
    FORM_URLENCODED: 'application/x-www-form-urlencoded'
};
exports.HEADERS = {
    ACCEPT: 'Accept',
    AUTHORIZATION: 'Authorization',
    CONTENT_TYPE: 'Content-Type',
    CONTENT_LENGTH: 'Content-Length',
    USER_AGENT: 'User-Agent',
    CACHE_CONTROL: 'Cache-Control',
    ETAG: 'ETag',
    LAST_MODIFIED: 'Last-Modified',
    CORS_ORIGIN: 'Access-Control-Allow-Origin',
    CORS_HEADERS: 'Access-Control-Allow-Headers',
    CORS_METHODS: 'Access-Control-Allow-Methods'
};
exports.EVENTS = {
    ENTITY_CREATED: 'EntityCreated',
    ENTITY_UPDATED: 'EntityUpdated',
    ENTITY_DELETED: 'EntityDeleted',
    OPERATION_STARTED: 'OperationStarted',
    OPERATION_COMPLETED: 'OperationCompleted',
    OPERATION_FAILED: 'OperationFailed',
    DOWNLOAD_STARTED: 'DownloadStarted',
    DOWNLOAD_COMPLETED: 'DownloadCompleted',
    DOWNLOAD_FAILED: 'DownloadFailed',
    BROWSER_NAVIGATION: 'BrowserNavigation',
    BROWSER_CLICK: 'BrowserClick',
    BROWSER_TYPE: 'BrowserType',
    SECURITY_VIOLATION: 'SecurityViolation'
};
exports.ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    BUSINESS_RULE_ERROR: 'BUSINESS_RULE_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    CONFLICT_ERROR: 'CONFLICT_ERROR',
    UNAUTHORIZED_ERROR: 'UNAUTHORIZED_ERROR',
    FORBIDDEN_ERROR: 'FORBIDDEN_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    EXTERNAL_ERROR: 'EXTERNAL_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    BROWSER_AUTOMATION_ERROR: 'BROWSER_AUTOMATION_ERROR',
    DOWNLOAD_ERROR: 'DOWNLOAD_ERROR',
    STORAGE_ERROR: 'STORAGE_ERROR',
    SECURITY_ERROR: 'SECURITY_ERROR'
};
exports.BROWSER_SELECTORS = {
    GOOGLE_IMAGES: {
        SEARCH_BOX: 'input[name="q"]',
        SEARCH_BUTTON: 'input[type="submit"]',
        IMAGE_RESULTS: 'img[data-src]',
        IMAGE_CONTAINER: '.rg_i',
        LARGE_IMAGE: '.n3VNCb',
        THUMBNAIL: '.Q4LuWd'
    },
    CHATGPT: {
        MESSAGE_INPUT: 'textarea[data-id="root"]',
        SEND_BUTTON: 'button[data-testid="send-button"]',
        CONVERSATION: '.conversation',
        MESSAGE: '.message',
        USER_MESSAGE: '.user-message',
        ASSISTANT_MESSAGE: '.assistant-message'
    },
    CHROME_EXTENSION: {
        POPUP: '.popup-container',
        SETTINGS: '.settings-panel',
        DOWNLOAD_BUTTON: '.download-btn',
        STATUS_INDICATOR: '.status-indicator'
    }
};
exports.FILE_EXTENSIONS = {
    IMAGES: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    DOCUMENTS: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    SPREADSHEETS: ['.xls', '.xlsx', '.csv'],
    PRESENTATIONS: ['.ppt', '.pptx'],
    ARCHIVES: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    VIDEOS: ['.mp4', '.avi', '.mkv', '.mov', '.wmv'],
    AUDIO: ['.mp3', '.wav', '.flac', '.aac', '.ogg']
};
exports.MIME_TYPES = {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    GIF: 'image/gif',
    WEBP: 'image/webp',
    SVG: 'image/svg+xml',
    PDF: 'application/pdf',
    ZIP: 'application/zip',
    JSON: 'application/json',
    XML: 'application/xml',
    HTML: 'text/html',
    CSS: 'text/css',
    JAVASCRIPT: 'application/javascript'
};
exports.REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    PHONE: /^[\+]?[1-9][\d]{0,15}$/,
    POSTAL_CODE: /^[0-9]{5}(-[0-9]{4})?$/,
    IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    SEMANTIC_VERSION: /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/
};
exports.DEFAULTS = {
    TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    CACHE_TTL: 300000,
    PAGE_SIZE: 20,
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    RATE_LIMIT_WINDOW: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100
};
exports.BROWSER = {
    DEFAULT_TIMEOUT: 5000,
    DEFAULT_VIEWPORT: {
        width: 1920,
        height: 1080
    },
    USER_AGENTS: {
        CHROME: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        FIREFOX: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        SAFARI: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
    }
};
exports.STORAGE_KEYS = {
    USER_PREFERENCES: 'user_preferences',
    DOWNLOAD_HISTORY: 'download_history',
    SEARCH_HISTORY: 'search_history',
    AUTOMATION_PATTERNS: 'automation_patterns',
    SECURITY_SETTINGS: 'security_settings',
    PERFORMANCE_METRICS: 'performance_metrics'
};
exports.CHROME_EXTENSION = {
    POPUP_WIDTH: 400,
    POPUP_HEIGHT: 600,
    ICON_SIZES: [16, 32, 48, 128],
    PERMISSIONS: {
        TABS: 'tabs',
        ACTIVE_TAB: 'activeTab',
        STORAGE: 'storage',
        DOWNLOADS: 'downloads',
        SCRIPTING: 'scripting',
        HOST_PERMISSIONS: 'host_permissions'
    }
};
exports.API_ENDPOINTS = {
    HEALTH: '/health',
    VERSION: '/version',
    USERS: '/users',
    AUTH: '/auth',
    DOWNLOADS: '/downloads',
    SEARCH: '/search',
    AUTOMATION: '/automation',
    METRICS: '/metrics'
};
exports.DATE_FORMATS = {
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    SHORT: 'YYYY-MM-DD',
    LONG: 'YYYY-MM-DD HH:mm:ss',
    TIMESTAMP: 'YYYY-MM-DD_HH-mm-ss'
};
exports.LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};
exports.ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test'
};
exports.FEATURE_FLAGS = {
    ENABLE_ANALYTICS: 'enable_analytics',
    ENABLE_CACHING: 'enable_caching',
    ENABLE_RATE_LIMITING: 'enable_rate_limiting',
    ENABLE_SECURITY_HEADERS: 'enable_security_headers',
    ENABLE_COMPRESSION: 'enable_compression'
};
//# sourceMappingURL=constants.js.map