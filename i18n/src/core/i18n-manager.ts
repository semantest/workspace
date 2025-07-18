import { Entity, DomainEvent } from '@semantest/core';
import { 
  Locale, 
  TranslationBundle, 
  I18nConfig,
  TranslationKey,
  InterpolationValues,
  FormatOptions
} from '../types';

/**
 * Core internationalization manager
 */
export class I18nManager extends Entity<I18nManager> {
  private currentLocale: Locale;
  private bundles: Map<string, TranslationBundle> = new Map();
  private config: I18nConfig;
  private loadedNamespaces: Set<string> = new Set();
  
  constructor(config: I18nConfig) {
    super();
    this.config = config;
    this.currentLocale = this.detectInitialLocale();
  }

  /**
   * Get current locale
   */
  getLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * Change current locale
   */
  async changeLocale(locale: Locale): Promise<void> {
    if (!this.config.supportedLocales.includes(locale)) {
      throw new Error(`Locale ${locale} is not supported`);
    }
    
    const previousLocale = this.currentLocale;
    this.currentLocale = locale;
    
    // Load translations for new locale
    await this.loadTranslations(locale);
    
    // Store preference
    if (this.config.detection?.caches?.includes('localStorage')) {
      localStorage.setItem('semantest-locale', locale);
    }
    
    this.addDomainEvent(new LocaleChanged({
      correlationId: this.generateCorrelationId(),
      previousLocale,
      newLocale: locale,
      timestamp: new Date()
    }));
  }

  /**
   * Translate a key
   */
  t(
    key: TranslationKey,
    values?: InterpolationValues,
    options?: TranslateOptions
  ): string {
    const namespace = options?.namespace || 'common';
    const locale = options?.locale || this.currentLocale;
    
    // Get translation
    let translation = this.getTranslation(key, namespace, locale);
    
    if (!translation) {
      // Fallback chain
      const fallbackLocale = this.getFallbackLocale(locale);
      if (fallbackLocale) {
        translation = this.getTranslation(key, namespace, fallbackLocale);
      }
    }
    
    if (!translation) {
      // Missing translation
      this.handleMissingTranslation(key, namespace, locale);
      return options?.defaultValue || key;
    }
    
    // Handle pluralization
    if (values?.count !== undefined && typeof translation === 'object') {
      translation = this.selectPlural(translation, values.count, locale);
    }
    
    // Interpolate values
    if (values) {
      translation = this.interpolate(translation, values);
    }
    
    return translation;
  }

  /**
   * Format a number
   */
  formatNumber(
    value: number,
    options?: Intl.NumberFormatOptions
  ): string {
    return new Intl.NumberFormat(this.currentLocale, options).format(value);
  }

  /**
   * Format a date
   */
  formatDate(
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
  }

  /**
   * Format currency
   */
  formatCurrency(
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ): string {
    return new Intl.NumberFormat(this.currentLocale, {
      style: 'currency',
      currency,
      ...options
    }).format(value);
  }

  /**
   * Format relative time
   */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ): string {
    const rtf = new Intl.RelativeTimeFormat(this.currentLocale, options);
    return rtf.format(value, unit);
  }

  /**
   * Get locale direction (LTR/RTL)
   */
  getDirection(): 'ltr' | 'rtl' {
    const rtlLocales = ['ar', 'he', 'fa', 'ur'];
    const primaryLanguage = this.currentLocale.split('-')[0];
    return rtlLocales.includes(primaryLanguage) ? 'rtl' : 'ltr';
  }

  /**
   * Load translations for a locale
   */
  async loadTranslations(
    locale: Locale,
    namespaces?: string[]
  ): Promise<void> {
    const namespacesToLoad = namespaces || ['common'];
    
    await Promise.all(
      namespacesToLoad.map(async namespace => {
        const bundleKey = `${locale}:${namespace}`;
        
        if (this.bundles.has(bundleKey)) {
          return; // Already loaded
        }
        
        try {
          const bundle = await this.fetchTranslationBundle(locale, namespace);
          this.bundles.set(bundleKey, bundle);
          this.loadedNamespaces.add(namespace);
          
          this.addDomainEvent(new TranslationsLoaded({
            correlationId: this.generateCorrelationId(),
            locale,
            namespace,
            keyCount: Object.keys(bundle.translations).length,
            timestamp: new Date()
          }));
        } catch (error) {
          console.error(`Failed to load translations for ${locale}:${namespace}`, error);
          
          // Try fallback locale
          const fallback = this.getFallbackLocale(locale);
          if (fallback && fallback !== locale) {
            await this.loadTranslations(fallback, [namespace]);
          }
        }
      })
    );
  }

  /**
   * Add custom translations
   */
  addTranslations(
    locale: Locale,
    namespace: string,
    translations: Record<string, any>
  ): void {
    const bundleKey = `${locale}:${namespace}`;
    const existingBundle = this.bundles.get(bundleKey);
    
    if (existingBundle) {
      // Merge translations
      existingBundle.translations = this.deepMerge(
        existingBundle.translations,
        translations
      );
    } else {
      // Create new bundle
      this.bundles.set(bundleKey, {
        locale,
        namespace,
        translations
      });
    }
  }

  /**
   * Get available locales
   */
  getAvailableLocales(): Locale[] {
    return this.config.supportedLocales;
  }

  /**
   * Check if locale is supported
   */
  isLocaleSupported(locale: Locale): boolean {
    return this.config.supportedLocales.includes(locale);
  }

  /**
   * Get locale metadata
   */
  getLocaleMetadata(locale: Locale): LocaleMetadata {
    const [language, region] = locale.split('-');
    
    return {
      locale,
      language,
      region,
      displayName: new Intl.DisplayNames([locale], { type: 'language' }).of(locale)!,
      nativeName: new Intl.DisplayNames([locale], { 
        type: 'language',
        languageDisplay: 'native'
      }).of(locale)!,
      direction: this.getDirection(),
      isRTL: this.getDirection() === 'rtl'
    };
  }

  /**
   * Detect initial locale
   */
  private detectInitialLocale(): Locale {
    const detectionOrder = this.config.detection?.order || ['navigator'];
    
    for (const method of detectionOrder) {
      const detected = this.detectByMethod(method);
      if (detected && this.isLocaleSupported(detected)) {
        return detected;
      }
    }
    
    return this.config.defaultLocale;
  }

  /**
   * Detect locale by method
   */
  private detectByMethod(method: string): Locale | null {
    switch (method) {
      case 'localStorage':
        return localStorage.getItem('semantest-locale') as Locale;
      
      case 'navigator':
        const navigatorLocale = navigator.language;
        // Try exact match first
        if (this.config.supportedLocales.includes(navigatorLocale as Locale)) {
          return navigatorLocale as Locale;
        }
        // Try language-only match
        const language = navigatorLocale.split('-')[0];
        return this.config.supportedLocales.find(l => l.startsWith(language)) || null;
      
      case 'htmlTag':
        return document.documentElement.lang as Locale || null;
      
      case 'querystring':
        const params = new URLSearchParams(window.location.search);
        return params.get('locale') as Locale || null;
      
      default:
        return null;
    }
  }

  /**
   * Get translation from bundle
   */
  private getTranslation(
    key: string,
    namespace: string,
    locale: Locale
  ): string | Record<string, string> | undefined {
    const bundleKey = `${locale}:${namespace}`;
    const bundle = this.bundles.get(bundleKey);
    
    if (!bundle) {
      return undefined;
    }
    
    // Navigate nested keys
    const keys = key.split('.');
    let value: any = bundle.translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Get fallback locale
   */
  private getFallbackLocale(locale: Locale): Locale | null {
    // Try language-only fallback
    const language = locale.split('-')[0];
    const languageFallback = this.config.supportedLocales.find(
      l => l !== locale && l.startsWith(language)
    );
    
    if (languageFallback) {
      return languageFallback;
    }
    
    // Use configured fallback
    return this.config.fallbackLocale || null;
  }

  /**
   * Handle missing translation
   */
  private handleMissingTranslation(
    key: string,
    namespace: string,
    locale: Locale
  ): void {
    console.warn(`Missing translation: ${locale}:${namespace}:${key}`);
    
    this.addDomainEvent(new MissingTranslation({
      correlationId: this.generateCorrelationId(),
      key,
      namespace,
      locale,
      timestamp: new Date()
    }));
  }

  /**
   * Select plural form
   */
  private selectPlural(
    translations: Record<string, string>,
    count: number,
    locale: Locale
  ): string {
    const pr = new Intl.PluralRules(locale);
    const rule = pr.select(count);
    
    // Try exact count first
    if (count.toString() in translations) {
      return translations[count.toString()];
    }
    
    // Try plural rule
    if (rule in translations) {
      return translations[rule];
    }
    
    // Fallback to 'other'
    return translations.other || Object.values(translations)[0];
  }

  /**
   * Interpolate values in translation
   */
  private interpolate(
    translation: string,
    values: InterpolationValues
  ): string {
    return translation.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return values[key]?.toString() || match;
    });
  }

  /**
   * Fetch translation bundle
   */
  private async fetchTranslationBundle(
    locale: Locale,
    namespace: string
  ): Promise<TranslationBundle> {
    const url = this.config.loadPath
      .replace('{{locale}}', locale)
      .replace('{{namespace}}', namespace);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load translations from ${url}`);
    }
    
    const translations = await response.json();
    
    return {
      locale,
      namespace,
      translations
    };
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  getId(): string {
    return 'i18n-manager';
  }
}

// Domain Events
export class LocaleChanged extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      previousLocale: Locale;
      newLocale: Locale;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class TranslationsLoaded extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      locale: Locale;
      namespace: string;
      keyCount: number;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

export class MissingTranslation extends DomainEvent {
  constructor(
    public readonly payload: {
      correlationId: string;
      key: string;
      namespace: string;
      locale: Locale;
      timestamp: Date;
    }
  ) {
    super(payload.correlationId);
  }
}

// Types
export interface TranslateOptions {
  namespace?: string;
  locale?: Locale;
  defaultValue?: string;
}

export interface LocaleMetadata {
  locale: Locale;
  language: string;
  region?: string;
  displayName: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
}