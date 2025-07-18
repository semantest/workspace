import React, { createContext, useContext, useEffect, useState } from 'react';
import { I18nManager } from '../../core/i18n-manager';
import { 
  Locale, 
  TranslationKey, 
  InterpolationValues, 
  TranslateOptions,
  LocaleMetadata 
} from '../../types';

/**
 * React context for i18n
 */
interface I18nContextValue {
  i18n: I18nManager;
  locale: Locale;
  t: (
    key: TranslationKey, 
    values?: InterpolationValues, 
    options?: TranslateOptions
  ) => string;
  changeLocale: (locale: Locale) => Promise<void>;
  availableLocales: Locale[];
  localeMetadata: LocaleMetadata;
  direction: 'ltr' | 'rtl';
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency: string, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

/**
 * I18n Provider props
 */
interface I18nProviderProps {
  i18n: I18nManager;
  children: React.ReactNode;
}

/**
 * I18n Provider component
 */
export function I18nProvider({ i18n, children }: I18nProviderProps) {
  const [locale, setLocale] = useState(i18n.getLocale());
  const [localeMetadata, setLocaleMetadata] = useState(i18n.getLocaleMetadata(locale));
  
  useEffect(() => {
    const handleLocaleChange = (event: CustomEvent) => {
      const newLocale = event.detail.newLocale;
      setLocale(newLocale);
      setLocaleMetadata(i18n.getLocaleMetadata(newLocale));
    };
    
    // Listen for locale changes
    window.addEventListener('localeChanged', handleLocaleChange as EventListener);
    
    return () => {
      window.removeEventListener('localeChanged', handleLocaleChange as EventListener);
    };
  }, [i18n]);
  
  // Update document attributes for RTL support
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeMetadata.direction;
  }, [locale, localeMetadata]);
  
  const contextValue: I18nContextValue = {
    i18n,
    locale,
    t: (key, values, options) => i18n.t(key, values, options),
    changeLocale: async (newLocale) => {
      await i18n.changeLocale(newLocale);
      setLocale(newLocale);
      setLocaleMetadata(i18n.getLocaleMetadata(newLocale));
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('localeChanged', {
        detail: { previousLocale: locale, newLocale }
      }));
    },
    availableLocales: i18n.getAvailableLocales(),
    localeMetadata,
    direction: localeMetadata.direction,
    formatNumber: (value, options) => i18n.formatNumber(value, options),
    formatDate: (value, options) => i18n.formatDate(value, options),
    formatCurrency: (value, currency, options) => i18n.formatCurrency(value, currency, options),
    formatRelativeTime: (value, unit, options) => i18n.formatRelativeTime(value, unit, options)
  };
  
  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to use i18n context
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * Hook for translations
 */
export function useTranslation(namespace?: string) {
  const { t, locale, changeLocale } = useI18n();
  
  return {
    t: (key: TranslationKey, values?: InterpolationValues, options?: TranslateOptions) => 
      t(key, values, { ...options, namespace }),
    locale,
    changeLocale
  };
}

/**
 * Hook for locale information
 */
export function useLocale() {
  const { locale, changeLocale, availableLocales, localeMetadata, direction } = useI18n();
  
  return {
    locale,
    changeLocale,
    availableLocales,
    localeMetadata,
    direction,
    isRTL: direction === 'rtl'
  };
}

/**
 * Hook for formatting
 */
export function useFormatting() {
  const { formatNumber, formatDate, formatCurrency, formatRelativeTime } = useI18n();
  
  return {
    formatNumber,
    formatDate,
    formatCurrency,
    formatRelativeTime
  };
}

/**
 * Language selector component
 */
export function LanguageSelector({ className }: { className?: string }) {
  const { locale, changeLocale, availableLocales } = useI18n();
  const { i18n } = useI18n();
  
  return (
    <select
      value={locale}
      onChange={(e) => changeLocale(e.target.value as Locale)}
      className={className}
    >
      {availableLocales.map(loc => {
        const metadata = i18n.getLocaleMetadata(loc);
        return (
          <option key={loc} value={loc}>
            {metadata.nativeName} ({metadata.displayName})
          </option>
        );
      })}
    </select>
  );
}

/**
 * HOC for i18n
 */
export function withI18n<P extends object>(
  Component: React.ComponentType<P & { i18n: I18nContextValue }>
) {
  return function WithI18nComponent(props: P) {
    const i18n = useI18n();
    return <Component {...props} i18n={i18n} />;
  };
}

/**
 * Trans component for interpolated translations
 */
interface TransProps {
  i18nKey: TranslationKey;
  values?: InterpolationValues;
  components?: Record<string, React.ComponentType<any>>;
  namespace?: string;
  defaultValue?: string;
}

export function Trans({ 
  i18nKey, 
  values, 
  components = {}, 
  namespace, 
  defaultValue 
}: TransProps) {
  const { t } = useTranslation(namespace);
  
  const translation = t(i18nKey, values, { defaultValue });
  
  // Simple component interpolation
  let result = translation;
  Object.entries(components).forEach(([key, Component]) => {
    const regex = new RegExp(`<${key}>(.*?)</${key}>`, 'g');
    result = result.replace(regex, (match, content) => {
      // This is simplified - in production, use proper React rendering
      return `<Component>${content}</Component>`;
    });
  });
  
  return <>{result}</>;
}