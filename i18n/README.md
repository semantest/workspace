# Semantest Internationalization (i18n)

Comprehensive internationalization support for the Semantest platform.

## Overview

Semantest supports multiple languages and regions to serve a global user base. Our i18n system provides:

- 🌍 **30+ Languages**: Full UI translation
- 🌏 **Regional Variants**: Locale-specific customizations
- 📝 **RTL Support**: Right-to-left language support
- 💱 **Currency/Date**: Localized formatting
- 🔍 **SEO**: Multilingual optimization

## Supported Languages

### Tier 1 (Full Support)
- English (en-US, en-GB, en-AU, en-CA)
- Spanish (es-ES, es-MX, es-AR)
- French (fr-FR, fr-CA)
- German (de-DE, de-AT, de-CH)
- Portuguese (pt-BR, pt-PT)
- Italian (it-IT)
- Dutch (nl-NL, nl-BE)
- Russian (ru-RU)
- Japanese (ja-JP)
- Korean (ko-KR)
- Chinese Simplified (zh-CN)
- Chinese Traditional (zh-TW, zh-HK)

### Tier 2 (UI Translation)
- Arabic (ar-SA) - RTL
- Hebrew (he-IL) - RTL
- Turkish (tr-TR)
- Polish (pl-PL)
- Swedish (sv-SE)
- Norwegian (no-NO)
- Danish (da-DK)
- Finnish (fi-FI)
- Czech (cs-CZ)
- Hungarian (hu-HU)
- Romanian (ro-RO)
- Greek (el-GR)
- Thai (th-TH)
- Vietnamese (vi-VN)
- Indonesian (id-ID)
- Malay (ms-MY)
- Hindi (hi-IN)

## Architecture

```
i18n/
├── locales/           # Translation files
│   ├── en-US/        # English (US) - base language
│   ├── es-ES/        # Spanish (Spain)
│   ├── fr-FR/        # French (France)
│   └── ...           # Other locales
├── src/
│   ├── core/         # i18n core functionality
│   ├── providers/    # Framework-specific providers
│   ├── formatters/   # Number, date, currency formatters
│   ├── validators/   # Translation validators
│   └── tools/        # CLI and build tools
├── scripts/          # Translation management scripts
└── config/           # Configuration files
```

## Features

### 1. Dynamic Language Switching
- Runtime language switching without page reload
- Persistent language preferences
- Automatic language detection
- Fallback chain support

### 2. Translation Management
- Centralized translation keys
- Namespace organization
- Pluralization support
- Context-aware translations

### 3. Content Localization
- Markdown content translation
- Rich text formatting
- Image and media localization
- SEO metadata translation

### 4. Developer Experience
- TypeScript support with type-safe keys
- Hot reload for translations
- Missing translation detection
- Translation linting

### 5. Performance
- Lazy loading of language bundles
- Translation caching
- Optimized bundle sizes
- CDN support

## Usage

### Basic Usage

```typescript
import { useTranslation } from '@semantest/i18n';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.description')}</p>
    </div>
  );
}
```

### Pluralization

```typescript
t('items.count', { count: 5 })
// Returns: "5 items" (English)
// Returns: "5 elementos" (Spanish)
// Returns: "5 éléments" (French)
```

### Formatting

```typescript
import { formatCurrency, formatDate } from '@semantest/i18n';

formatCurrency(1234.56, 'USD', 'en-US'); // $1,234.56
formatCurrency(1234.56, 'EUR', 'de-DE'); // 1.234,56 €

formatDate(new Date(), 'long', 'ja-JP'); // 2024年1月18日
```

### Namespace Usage

```typescript
const { t } = useTranslation('marketplace');

t('package.install'); // Uses marketplace namespace
```

## Configuration

### Application Setup

```typescript
import { I18nProvider, createI18n } from '@semantest/i18n';

const i18n = createI18n({
  defaultLocale: 'en-US',
  supportedLocales: ['en-US', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP'],
  fallbackLocale: 'en-US',
  loadPath: '/locales/{{locale}}/{{namespace}}.json',
  detection: {
    order: ['localStorage', 'navigator', 'htmlTag'],
    caches: ['localStorage']
  }
});

function App() {
  return (
    <I18nProvider i18n={i18n}>
      <YourApp />
    </I18nProvider>
  );
}
```

## Translation Workflow

### 1. Extract Keys
```bash
semantest i18n extract
```

### 2. Translate
```bash
semantest i18n translate --locale es-ES
```

### 3. Validate
```bash
semantest i18n validate
```

### 4. Build
```bash
semantest i18n build
```

## Best Practices

### Key Naming
- Use descriptive, hierarchical keys
- Group by feature/component
- Avoid abbreviations

```
✅ Good: user.profile.settings.language
❌ Bad: usr.prof.set.lang
```

### Translation Context
- Provide context for translators
- Use comments for ambiguous terms
- Include screenshots when possible

### Performance
- Lazy load language bundles
- Use namespaces to split translations
- Cache translations aggressively
- Minimize bundle sizes

### Quality
- Regular translation reviews
- Native speaker validation
- Consistency checks
- Cultural appropriateness

## API Reference

See [API Documentation](./docs/API.md) for detailed API reference.

## Contributing

See [Translation Guide](./TRANSLATION_GUIDE.md) for contributing translations.