/**
 * Supported locales
 */
export type Locale = 
  // English
  | 'en-US' | 'en-GB' | 'en-AU' | 'en-CA'
  // Spanish
  | 'es-ES' | 'es-MX' | 'es-AR'
  // French
  | 'fr-FR' | 'fr-CA'
  // German
  | 'de-DE' | 'de-AT' | 'de-CH'
  // Portuguese
  | 'pt-BR' | 'pt-PT'
  // Italian
  | 'it-IT'
  // Dutch
  | 'nl-NL' | 'nl-BE'
  // Russian
  | 'ru-RU'
  // Japanese
  | 'ja-JP'
  // Korean
  | 'ko-KR'
  // Chinese
  | 'zh-CN' | 'zh-TW' | 'zh-HK'
  // Arabic
  | 'ar-SA'
  // Hebrew
  | 'he-IL'
  // Turkish
  | 'tr-TR'
  // Polish
  | 'pl-PL'
  // Swedish
  | 'sv-SE'
  // Norwegian
  | 'no-NO'
  // Danish
  | 'da-DK'
  // Finnish
  | 'fi-FI'
  // Czech
  | 'cs-CZ'
  // Hungarian
  | 'hu-HU'
  // Romanian
  | 'ro-RO'
  // Greek
  | 'el-GR'
  // Thai
  | 'th-TH'
  // Vietnamese
  | 'vi-VN'
  // Indonesian
  | 'id-ID'
  // Malay
  | 'ms-MY'
  // Hindi
  | 'hi-IN';

/**
 * Translation key type
 */
export type TranslationKey = string;

/**
 * Interpolation values for translations
 */
export interface InterpolationValues {
  [key: string]: string | number | boolean | Date;
  count?: number; // Special key for pluralization
}

/**
 * Translation options
 */
export interface TranslateOptions {
  namespace?: string;
  locale?: Locale;
  defaultValue?: string;
}

/**
 * Format options
 */
export interface FormatOptions {
  locale?: Locale;
}

/**
 * Translation bundle
 */
export interface TranslationBundle {
  locale: Locale;
  namespace: string;
  translations: Record<string, any>;
}

/**
 * i18n configuration
 */
export interface I18nConfig {
  // Default locale
  defaultLocale: Locale;
  
  // Fallback locale when translation is missing
  fallbackLocale?: Locale;
  
  // Supported locales
  supportedLocales: Locale[];
  
  // URL pattern for loading translations
  // Example: "/locales/{{locale}}/{{namespace}}.json"
  loadPath: string;
  
  // Initial namespaces to load
  namespaces?: string[];
  
  // Detection configuration
  detection?: {
    // Detection order
    order?: ('querystring' | 'cookie' | 'localStorage' | 'navigator' | 'htmlTag')[];
    
    // Caches to use
    caches?: ('localStorage' | 'cookie')[];
    
    // Cookie/localStorage key
    lookupKey?: string;
    
    // Query string parameter
    lookupQuerystring?: string;
  };
  
  // Debug mode
  debug?: boolean;
  
  // Missing key handler
  missingKeyHandler?: (key: string, namespace: string, locale: Locale) => void;
  
  // Interpolation settings
  interpolation?: {
    prefix?: string; // Default: "{{"
    suffix?: string; // Default: "}}"
  };
  
  // Pluralization settings
  pluralization?: {
    // Custom plural rules
    rules?: Record<Locale, (count: number) => string>;
  };
}

/**
 * Locale metadata
 */
export interface LocaleMetadata {
  locale: Locale;
  language: string;
  region?: string;
  displayName: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
}