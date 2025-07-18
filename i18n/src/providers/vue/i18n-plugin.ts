import { App, reactive, computed, inject, InjectionKey } from 'vue';
import { I18nManager } from '../../core/i18n-manager';
import { 
  Locale, 
  TranslationKey, 
  InterpolationValues, 
  TranslateOptions,
  LocaleMetadata 
} from '../../types';

/**
 * Vue i18n plugin
 */
export interface I18nPlugin {
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

// Injection key
export const I18nKey: InjectionKey<I18nPlugin> = Symbol('i18n');

/**
 * Create Vue i18n plugin
 */
export function createI18nPlugin(i18n: I18nManager) {
  return {
    install(app: App) {
      // Create reactive state
      const state = reactive({
        locale: i18n.getLocale(),
        localeMetadata: i18n.getLocaleMetadata(i18n.getLocale())
      });
      
      // Create plugin instance
      const plugin: I18nPlugin = {
        i18n,
        get locale() {
          return state.locale;
        },
        t: (key, values, options) => i18n.t(key, values, options),
        changeLocale: async (newLocale) => {
          await i18n.changeLocale(newLocale);
          state.locale = newLocale;
          state.localeMetadata = i18n.getLocaleMetadata(newLocale);
          
          // Update document attributes
          document.documentElement.lang = newLocale;
          document.documentElement.dir = state.localeMetadata.direction;
          
          // Dispatch event
          window.dispatchEvent(new CustomEvent('localeChanged', {
            detail: { previousLocale: state.locale, newLocale }
          }));
        },
        get availableLocales() {
          return i18n.getAvailableLocales();
        },
        get localeMetadata() {
          return state.localeMetadata;
        },
        get direction() {
          return state.localeMetadata.direction;
        },
        formatNumber: (value, options) => i18n.formatNumber(value, options),
        formatDate: (value, options) => i18n.formatDate(value, options),
        formatCurrency: (value, currency, options) => i18n.formatCurrency(value, currency, options),
        formatRelativeTime: (value, unit, options) => i18n.formatRelativeTime(value, unit, options)
      };
      
      // Provide globally
      app.provide(I18nKey, plugin);
      
      // Add global properties
      app.config.globalProperties.$t = plugin.t;
      app.config.globalProperties.$i18n = plugin;
      
      // Add global directive
      app.directive('t', {
        mounted(el, binding) {
          const key = binding.arg || el.textContent || '';
          el.textContent = plugin.t(key as TranslationKey, binding.value);
        },
        updated(el, binding) {
          const key = binding.arg || el.textContent || '';
          el.textContent = plugin.t(key as TranslationKey, binding.value);
        }
      });
    }
  };
}

/**
 * Composition API hook
 */
export function useI18n() {
  const i18n = inject(I18nKey);
  if (!i18n) {
    throw new Error('No i18n provided. Did you forget to install the plugin?');
  }
  return i18n;
}

/**
 * Translation composable
 */
export function useTranslation(namespace?: string) {
  const i18n = useI18n();
  
  return {
    t: (key: TranslationKey, values?: InterpolationValues, options?: TranslateOptions) => 
      i18n.t(key, values, { ...options, namespace }),
    locale: computed(() => i18n.locale),
    changeLocale: i18n.changeLocale
  };
}

/**
 * Locale composable
 */
export function useLocale() {
  const i18n = useI18n();
  
  return {
    locale: computed(() => i18n.locale),
    changeLocale: i18n.changeLocale,
    availableLocales: computed(() => i18n.availableLocales),
    localeMetadata: computed(() => i18n.localeMetadata),
    direction: computed(() => i18n.direction),
    isRTL: computed(() => i18n.direction === 'rtl')
  };
}

/**
 * Formatting composable
 */
export function useFormatting() {
  const i18n = useI18n();
  
  return {
    formatNumber: i18n.formatNumber,
    formatDate: i18n.formatDate,
    formatCurrency: i18n.formatCurrency,
    formatRelativeTime: i18n.formatRelativeTime
  };
}

// Component example
export const LanguageSelector = {
  name: 'LanguageSelector',
  template: `
    <select :value="locale" @change="changeLocale($event.target.value)">
      <option v-for="loc in availableLocales" :key="loc" :value="loc">
        {{ getLocaleMetadata(loc).nativeName }} ({{ getLocaleMetadata(loc).displayName }})
      </option>
    </select>
  `,
  setup() {
    const { locale, changeLocale, availableLocales, i18n } = useI18n();
    
    const getLocaleMetadata = (loc: Locale) => i18n.i18n.getLocaleMetadata(loc);
    
    return {
      locale,
      changeLocale,
      availableLocales,
      getLocaleMetadata
    };
  }
};

// Trans component
export const Trans = {
  name: 'Trans',
  props: {
    i18nKey: {
      type: String,
      required: true
    },
    values: {
      type: Object,
      default: () => ({})
    },
    tag: {
      type: String,
      default: 'span'
    },
    namespace: String,
    defaultValue: String
  },
  setup(props: any) {
    const { t } = useTranslation(props.namespace);
    
    const translation = computed(() => 
      t(props.i18nKey, props.values, { defaultValue: props.defaultValue })
    );
    
    return {
      translation
    };
  },
  render() {
    return h(this.tag, {}, this.translation);
  }
};