// Core
export { I18nManager } from './core/i18n-manager';

// Types
export * from './types';

// React
export {
  I18nProvider,
  useI18n,
  useTranslation,
  useLocale,
  useFormatting,
  LanguageSelector as ReactLanguageSelector,
  withI18n,
  Trans
} from './providers/react/I18nProvider';

// Vue
export {
  createI18nPlugin,
  useI18n as useI18nVue,
  useTranslation as useTranslationVue,
  useLocale as useLocaleVue,
  useFormatting as useFormattingVue,
  LanguageSelector as VueLanguageSelector,
  Trans as TransVue
} from './providers/vue/i18n-plugin';

// Angular
export {
  I18nModule,
  I18nService,
  TranslatePipe,
  I18nNumberPipe,
  I18nDatePipe,
  I18nCurrencyPipe,
  I18nDirective,
  LanguageSelectorComponent,
  I18N_CONFIG
} from './providers/angular/i18n.module';

// Utilities
export { TranslationExtractor } from './tools/extract-translations';

/**
 * Create i18n instance
 */
import { I18nConfig } from './types';
import { I18nManager } from './core/i18n-manager';

export function createI18n(config: I18nConfig): I18nManager {
  return new I18nManager(config);
}

/**
 * Default configuration
 */
export const defaultConfig: Partial<I18nConfig> = {
  defaultLocale: 'en-US',
  fallbackLocale: 'en-US',
  supportedLocales: [
    'en-US', 'es-ES', 'fr-FR', 'de-DE', 'pt-BR',
    'it-IT', 'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW'
  ],
  loadPath: '/locales/{{locale}}/{{namespace}}.json',
  namespaces: ['common'],
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage']
  }
};