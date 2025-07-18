import { NgModule, ModuleWithProviders, Injectable, Inject, InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { I18nManager } from '../../core/i18n-manager';
import { 
  Locale, 
  TranslationKey, 
  InterpolationValues, 
  TranslateOptions,
  LocaleMetadata,
  I18nConfig 
} from '../../types';

// Injection token for i18n configuration
export const I18N_CONFIG = new InjectionToken<I18nConfig>('i18n.config');

/**
 * Angular i18n service
 */
@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private i18nManager: I18nManager;
  private localeSubject: BehaviorSubject<Locale>;
  private metadataSubject: BehaviorSubject<LocaleMetadata>;
  
  // Observables
  public locale$: Observable<Locale>;
  public metadata$: Observable<LocaleMetadata>;
  
  constructor(@Inject(I18N_CONFIG) config: I18nConfig) {
    this.i18nManager = new I18nManager(config);
    this.localeSubject = new BehaviorSubject(this.i18nManager.getLocale());
    this.metadataSubject = new BehaviorSubject(
      this.i18nManager.getLocaleMetadata(this.i18nManager.getLocale())
    );
    
    this.locale$ = this.localeSubject.asObservable();
    this.metadata$ = this.metadataSubject.asObservable();
    
    // Initialize
    this.updateDocumentAttributes();
  }
  
  get locale(): Locale {
    return this.localeSubject.value;
  }
  
  get localeMetadata(): LocaleMetadata {
    return this.metadataSubject.value;
  }
  
  get availableLocales(): Locale[] {
    return this.i18nManager.getAvailableLocales();
  }
  
  get direction(): 'ltr' | 'rtl' {
    return this.localeMetadata.direction;
  }
  
  get isRTL(): boolean {
    return this.direction === 'rtl';
  }
  
  /**
   * Translate a key
   */
  t(
    key: TranslationKey,
    values?: InterpolationValues,
    options?: TranslateOptions
  ): string {
    return this.i18nManager.t(key, values, options);
  }
  
  /**
   * Change locale
   */
  async changeLocale(locale: Locale): Promise<void> {
    const previousLocale = this.locale;
    await this.i18nManager.changeLocale(locale);
    
    const newMetadata = this.i18nManager.getLocaleMetadata(locale);
    this.localeSubject.next(locale);
    this.metadataSubject.next(newMetadata);
    
    this.updateDocumentAttributes();
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('localeChanged', {
      detail: { previousLocale, newLocale: locale }
    }));
  }
  
  /**
   * Load translations for namespaces
   */
  async loadTranslations(namespaces: string[]): Promise<void> {
    await this.i18nManager.loadTranslations(this.locale, namespaces);
  }
  
  /**
   * Format number
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return this.i18nManager.formatNumber(value, options);
  }
  
  /**
   * Format date
   */
  formatDate(
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    return this.i18nManager.formatDate(value, options);
  }
  
  /**
   * Format currency
   */
  formatCurrency(
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ): string {
    return this.i18nManager.formatCurrency(value, currency, options);
  }
  
  /**
   * Format relative time
   */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: Intl.RelativeTimeFormatOptions
  ): string {
    return this.i18nManager.formatRelativeTime(value, unit, options);
  }
  
  /**
   * Update document attributes
   */
  private updateDocumentAttributes(): void {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = this.locale;
      document.documentElement.dir = this.direction;
    }
  }
}

/**
 * Translation pipe
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform {
  constructor(private i18n: I18nService) {}
  
  transform(
    key: TranslationKey,
    values?: InterpolationValues,
    options?: TranslateOptions
  ): string {
    return this.i18n.t(key, values, options);
  }
}

/**
 * Number format pipe
 */
@Pipe({
  name: 'i18nNumber',
  pure: false
})
export class I18nNumberPipe implements PipeTransform {
  constructor(private i18n: I18nService) {}
  
  transform(value: number, options?: Intl.NumberFormatOptions): string {
    return this.i18n.formatNumber(value, options);
  }
}

/**
 * Date format pipe
 */
@Pipe({
  name: 'i18nDate',
  pure: false
})
export class I18nDatePipe implements PipeTransform {
  constructor(private i18n: I18nService) {}
  
  transform(
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    return this.i18n.formatDate(value, options);
  }
}

/**
 * Currency format pipe
 */
@Pipe({
  name: 'i18nCurrency',
  pure: false
})
export class I18nCurrencyPipe implements PipeTransform {
  constructor(private i18n: I18nService) {}
  
  transform(
    value: number,
    currency: string,
    options?: Intl.NumberFormatOptions
  ): string {
    return this.i18n.formatCurrency(value, currency, options);
  }
}

/**
 * Translation directive
 */
import { Directive, ElementRef, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[i18n]'
})
export class I18nDirective implements OnInit, OnDestroy {
  @Input() i18n!: TranslationKey;
  @Input() i18nValues?: InterpolationValues;
  @Input() i18nOptions?: TranslateOptions;
  
  private subscription?: Subscription;
  
  constructor(
    private el: ElementRef,
    private i18nService: I18nService
  ) {}
  
  ngOnInit(): void {
    this.updateTranslation();
    
    // Update on locale change
    this.subscription = this.i18nService.locale$.subscribe(() => {
      this.updateTranslation();
    });
  }
  
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
  
  private updateTranslation(): void {
    this.el.nativeElement.textContent = this.i18nService.t(
      this.i18n,
      this.i18nValues,
      this.i18nOptions
    );
  }
}

/**
 * Language selector component
 */
import { Component } from '@angular/core';

@Component({
  selector: 'app-language-selector',
  template: `
    <select [value]="i18n.locale" (change)="onLocaleChange($event)">
      <option *ngFor="let locale of i18n.availableLocales" [value]="locale">
        {{ getLocaleMetadata(locale).nativeName }} 
        ({{ getLocaleMetadata(locale).displayName }})
      </option>
    </select>
  `
})
export class LanguageSelectorComponent {
  constructor(public i18n: I18nService) {}
  
  getLocaleMetadata(locale: Locale): LocaleMetadata {
    return this.i18n['i18nManager'].getLocaleMetadata(locale);
  }
  
  onLocaleChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.i18n.changeLocale(select.value as Locale);
  }
}

/**
 * i18n module
 */
@NgModule({
  declarations: [
    TranslatePipe,
    I18nNumberPipe,
    I18nDatePipe,
    I18nCurrencyPipe,
    I18nDirective,
    LanguageSelectorComponent
  ],
  exports: [
    TranslatePipe,
    I18nNumberPipe,
    I18nDatePipe,
    I18nCurrencyPipe,
    I18nDirective,
    LanguageSelectorComponent
  ]
})
export class I18nModule {
  static forRoot(config: I18nConfig): ModuleWithProviders<I18nModule> {
    return {
      ngModule: I18nModule,
      providers: [
        { provide: I18N_CONFIG, useValue: config },
        I18nService
      ]
    };
  }
}