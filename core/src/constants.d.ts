export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
export declare const HTTP_METHODS: {
    readonly GET: "GET";
    readonly POST: "POST";
    readonly PUT: "PUT";
    readonly DELETE: "DELETE";
    readonly PATCH: "PATCH";
    readonly HEAD: "HEAD";
    readonly OPTIONS: "OPTIONS";
};
export declare const CONTENT_TYPES: {
    readonly JSON: "application/json";
    readonly XML: "application/xml";
    readonly HTML: "text/html";
    readonly TEXT: "text/plain";
    readonly FORM_DATA: "multipart/form-data";
    readonly FORM_URLENCODED: "application/x-www-form-urlencoded";
};
export declare const HEADERS: {
    readonly ACCEPT: "Accept";
    readonly AUTHORIZATION: "Authorization";
    readonly CONTENT_TYPE: "Content-Type";
    readonly CONTENT_LENGTH: "Content-Length";
    readonly USER_AGENT: "User-Agent";
    readonly CACHE_CONTROL: "Cache-Control";
    readonly ETAG: "ETag";
    readonly LAST_MODIFIED: "Last-Modified";
    readonly CORS_ORIGIN: "Access-Control-Allow-Origin";
    readonly CORS_HEADERS: "Access-Control-Allow-Headers";
    readonly CORS_METHODS: "Access-Control-Allow-Methods";
};
export declare const EVENTS: {
    readonly ENTITY_CREATED: "EntityCreated";
    readonly ENTITY_UPDATED: "EntityUpdated";
    readonly ENTITY_DELETED: "EntityDeleted";
    readonly OPERATION_STARTED: "OperationStarted";
    readonly OPERATION_COMPLETED: "OperationCompleted";
    readonly OPERATION_FAILED: "OperationFailed";
    readonly DOWNLOAD_STARTED: "DownloadStarted";
    readonly DOWNLOAD_COMPLETED: "DownloadCompleted";
    readonly DOWNLOAD_FAILED: "DownloadFailed";
    readonly BROWSER_NAVIGATION: "BrowserNavigation";
    readonly BROWSER_CLICK: "BrowserClick";
    readonly BROWSER_TYPE: "BrowserType";
    readonly SECURITY_VIOLATION: "SecurityViolation";
};
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly BUSINESS_RULE_ERROR: "BUSINESS_RULE_ERROR";
    readonly NOT_FOUND_ERROR: "NOT_FOUND_ERROR";
    readonly CONFLICT_ERROR: "CONFLICT_ERROR";
    readonly UNAUTHORIZED_ERROR: "UNAUTHORIZED_ERROR";
    readonly FORBIDDEN_ERROR: "FORBIDDEN_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly EXTERNAL_ERROR: "EXTERNAL_ERROR";
    readonly CONFIGURATION_ERROR: "CONFIGURATION_ERROR";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly TIMEOUT_ERROR: "TIMEOUT_ERROR";
    readonly AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR";
    readonly AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR";
    readonly RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR";
    readonly BROWSER_AUTOMATION_ERROR: "BROWSER_AUTOMATION_ERROR";
    readonly DOWNLOAD_ERROR: "DOWNLOAD_ERROR";
    readonly STORAGE_ERROR: "STORAGE_ERROR";
    readonly SECURITY_ERROR: "SECURITY_ERROR";
};
export declare const BROWSER_SELECTORS: {
    readonly GOOGLE_IMAGES: {
        readonly SEARCH_BOX: "input[name=\"q\"]";
        readonly SEARCH_BUTTON: "input[type=\"submit\"]";
        readonly IMAGE_RESULTS: "img[data-src]";
        readonly IMAGE_CONTAINER: ".rg_i";
        readonly LARGE_IMAGE: ".n3VNCb";
        readonly THUMBNAIL: ".Q4LuWd";
    };
    readonly CHATGPT: {
        readonly MESSAGE_INPUT: "textarea[data-id=\"root\"]";
        readonly SEND_BUTTON: "button[data-testid=\"send-button\"]";
        readonly CONVERSATION: ".conversation";
        readonly MESSAGE: ".message";
        readonly USER_MESSAGE: ".user-message";
        readonly ASSISTANT_MESSAGE: ".assistant-message";
    };
    readonly CHROME_EXTENSION: {
        readonly POPUP: ".popup-container";
        readonly SETTINGS: ".settings-panel";
        readonly DOWNLOAD_BUTTON: ".download-btn";
        readonly STATUS_INDICATOR: ".status-indicator";
    };
};
export declare const FILE_EXTENSIONS: {
    readonly IMAGES: readonly [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
    readonly DOCUMENTS: readonly [".pdf", ".doc", ".docx", ".txt", ".rtf"];
    readonly SPREADSHEETS: readonly [".xls", ".xlsx", ".csv"];
    readonly PRESENTATIONS: readonly [".ppt", ".pptx"];
    readonly ARCHIVES: readonly [".zip", ".rar", ".7z", ".tar", ".gz"];
    readonly VIDEOS: readonly [".mp4", ".avi", ".mkv", ".mov", ".wmv"];
    readonly AUDIO: readonly [".mp3", ".wav", ".flac", ".aac", ".ogg"];
};
export declare const MIME_TYPES: {
    readonly JPEG: "image/jpeg";
    readonly PNG: "image/png";
    readonly GIF: "image/gif";
    readonly WEBP: "image/webp";
    readonly SVG: "image/svg+xml";
    readonly PDF: "application/pdf";
    readonly ZIP: "application/zip";
    readonly JSON: "application/json";
    readonly XML: "application/xml";
    readonly HTML: "text/html";
    readonly CSS: "text/css";
    readonly JAVASCRIPT: "application/javascript";
};
export declare const REGEX: {
    readonly EMAIL: RegExp;
    readonly URL: RegExp;
    readonly UUID: RegExp;
    readonly PHONE: RegExp;
    readonly POSTAL_CODE: RegExp;
    readonly IP_ADDRESS: RegExp;
    readonly SEMANTIC_VERSION: RegExp;
};
export declare const DEFAULTS: {
    readonly TIMEOUT: 5000;
    readonly RETRY_ATTEMPTS: 3;
    readonly RETRY_DELAY: 1000;
    readonly CACHE_TTL: 300000;
    readonly PAGE_SIZE: 20;
    readonly MAX_FILE_SIZE: number;
    readonly RATE_LIMIT_WINDOW: 60000;
    readonly RATE_LIMIT_MAX_REQUESTS: 100;
};
export declare const BROWSER: {
    readonly DEFAULT_TIMEOUT: 5000;
    readonly DEFAULT_VIEWPORT: {
        readonly width: 1920;
        readonly height: 1080;
    };
    readonly USER_AGENTS: {
        readonly CHROME: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";
        readonly FIREFOX: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0";
        readonly SAFARI: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15";
    };
};
export declare const STORAGE_KEYS: {
    readonly USER_PREFERENCES: "user_preferences";
    readonly DOWNLOAD_HISTORY: "download_history";
    readonly SEARCH_HISTORY: "search_history";
    readonly AUTOMATION_PATTERNS: "automation_patterns";
    readonly SECURITY_SETTINGS: "security_settings";
    readonly PERFORMANCE_METRICS: "performance_metrics";
};
export declare const CHROME_EXTENSION: {
    readonly POPUP_WIDTH: 400;
    readonly POPUP_HEIGHT: 600;
    readonly ICON_SIZES: readonly [16, 32, 48, 128];
    readonly PERMISSIONS: {
        readonly TABS: "tabs";
        readonly ACTIVE_TAB: "activeTab";
        readonly STORAGE: "storage";
        readonly DOWNLOADS: "downloads";
        readonly SCRIPTING: "scripting";
        readonly HOST_PERMISSIONS: "host_permissions";
    };
};
export declare const API_ENDPOINTS: {
    readonly HEALTH: "/health";
    readonly VERSION: "/version";
    readonly USERS: "/users";
    readonly AUTH: "/auth";
    readonly DOWNLOADS: "/downloads";
    readonly SEARCH: "/search";
    readonly AUTOMATION: "/automation";
    readonly METRICS: "/metrics";
};
export declare const DATE_FORMATS: {
    readonly ISO: "YYYY-MM-DDTHH:mm:ss.SSSZ";
    readonly SHORT: "YYYY-MM-DD";
    readonly LONG: "YYYY-MM-DD HH:mm:ss";
    readonly TIMESTAMP: "YYYY-MM-DD_HH-mm-ss";
};
export declare const LOG_LEVELS: {
    readonly ERROR: "error";
    readonly WARN: "warn";
    readonly INFO: "info";
    readonly DEBUG: "debug";
};
export declare const ENVIRONMENTS: {
    readonly DEVELOPMENT: "development";
    readonly STAGING: "staging";
    readonly PRODUCTION: "production";
    readonly TEST: "test";
};
export declare const FEATURE_FLAGS: {
    readonly ENABLE_ANALYTICS: "enable_analytics";
    readonly ENABLE_CACHING: "enable_caching";
    readonly ENABLE_RATE_LIMITING: "enable_rate_limiting";
    readonly ENABLE_SECURITY_HEADERS: "enable_security_headers";
    readonly ENABLE_COMPRESSION: "enable_compression";
};
//# sourceMappingURL=constants.d.ts.map