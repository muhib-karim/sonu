/**
 * Internationalization (i18n) System for SONU
 * Multi-language UI support with locale detection, dynamic loading, and auto-detection
 */

class I18nManager {
  constructor() {
    this.currentLocale = 'en';
    this.fallbackLocale = 'en';
    this.supportedLocales = [
      'en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'ru', 'it', 'nl', 'sv', 'da', 'no', 'fi',
      'pl', 'tr', 'ar', 'he', 'hi', 'th', 'vi', 'id', 'ms', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr',
      'sr', 'uk', 'el', 'ca', 'eu', 'ga', 'cy'
    ];
    this.translations = {};
    this.isEnabled = true;
    this.rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    this.autoDetectEnabled = true;

    this.initialize();
  }

  initialize() {
    if (!this.isEnabled) return;

    this.detectUserLocale();
    this.loadTranslations(this.currentLocale);
    this.applyLocale();

    console.log(`Internationalization initialized with locale: ${this.currentLocale}`);
  }

  // Locale Detection
  detectUserLocale() {
    // Check saved preference
    try {
      const savedLocale = localStorage.getItem('sonu-locale');
      if (savedLocale && this.supportedLocales.includes(savedLocale)) {
        this.currentLocale = savedLocale;
        return;
      }
    } catch (e) {}

    // Detect browser language
    const browserLang = this.detectBrowserLanguage();
    if (browserLang && this.supportedLocales.includes(browserLang)) {
      this.currentLocale = browserLang;
      return;
    }

    // Try language without region
    const baseLang = browserLang?.split('-')[0];
    if (baseLang && this.supportedLocales.includes(baseLang)) {
      this.currentLocale = baseLang;
      return;
    }

    this.currentLocale = this.fallbackLocale;
  }

  detectBrowserLanguage() {
    if (typeof navigator === 'undefined') return 'en';
    return navigator.language ||
           navigator.userLanguage ||
           navigator.browserLanguage ||
           navigator.systemLanguage ||
           'en';
  }

  // Auto-detect language from speech
  async detectLanguageFromAudio(audioBlob) {
    if (!this.autoDetectEnabled) return null;
    
    try {
      // Use Whisper's language detection capability
      if (typeof window !== 'undefined' && window.voiceApp && window.voiceApp.detectLanguage) {
        const result = await window.voiceApp.detectLanguage(audioBlob);
        if (result && result.language) {
          return result.language;
        }
      }
    } catch (e) {
      console.warn('Language auto-detection failed:', e);
    }
    return null;
  }

  // Translation Loading
  async loadTranslations(locale) {
    try {
      const response = await fetch(`locales/${locale}.json`);
      if (response.ok) {
        this.translations[locale] = await response.json();
        return;
      }
      
      // Try base language
      const baseLang = locale.split('-')[0];
      if (baseLang !== locale) {
        const baseResponse = await fetch(`locales/${baseLang}.json`);
        if (baseResponse.ok) {
          this.translations[locale] = await baseResponse.json();
          return;
        }
      }
      
      // Fallback
      this.translations[locale] = this.getFallbackTranslations(locale);
    } catch (error) {
      console.warn(`Failed to load translations for ${locale}:`, error);
      this.translations[locale] = this.getFallbackTranslations(locale);
    }
  }

  getFallbackTranslations(locale) {
    return {
      'app.name': 'SONU',
      'app.description': 'Offline Voice Typing Application',
      'nav.home': 'Home',
      'nav.history': 'History',
      'nav.settings': 'Settings',
      'nav.dictionary': 'Dictionary',
      'nav.snippets': 'Snippets',
      'nav.notes': 'Notes',
      'nav.style': 'Style',
      'button.save': 'Save',
      'button.cancel': 'Cancel',
      'button.close': 'Close',
      'button.delete': 'Delete',
      'button.edit': 'Edit',
      'status.loading': 'Loading...',
      'status.recording': 'Recording...',
      'status.processing': 'Processing...',
      'error.generic': 'An error occurred',
      'dictation.title': 'Speak anywhere',
      'dictation.description': 'SONU works in all your apps.',
      'dictation.hotkey': 'Hold {hotkey} to speak',
      'settings.title': 'Settings',
      'settings.general': 'General',
      'settings.system': 'System',
      'settings.model': 'Model Selector',
      'settings.themes': 'Themes',
      'settings.language': 'Language',
      'message.copied': 'Copied to clipboard',
      'message.saved': 'Settings saved',
      'message.error': 'An error occurred'
    };
  }

  // Translation Functions
  t(key, params = {}) {
    const locale = this.currentLocale;
    const translations = this.translations[locale] || this.translations[this.fallbackLocale] || {};

    let text = translations[key] || key;

    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), value);
    });

    return text;
  }

  has(key) {
    const locale = this.currentLocale;
    const translations = this.translations[locale] || this.translations[this.fallbackLocale] || {};
    return key in translations;
  }

  async setLocale(locale) {
    if (!this.supportedLocales.includes(locale)) {
      console.warn(`Unsupported locale: ${locale}`);
      return false;
    }

    if (!this.translations[locale]) {
      await this.loadTranslations(locale);
    }

    this.currentLocale = locale;
    try {
      localStorage.setItem('sonu-locale', locale);
    } catch (e) {}

    this.applyLocale();
    this.announceLocaleChange(locale);
    
    setTimeout(() => {
      this.updateContent();
    }, 100);

    return true;
  }

  applyLocale() {
    const locale = this.currentLocale;

    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;

      const isRTL = this.rtlLanguages.includes(locale.split('-')[0]);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.body?.classList.toggle('rtl', isRTL);

      this.updateTranslatableElements();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localeChanged', {
          detail: { locale, isRTL }
        }));
      }
    }
  }

  updateTranslatableElements() {
    if (typeof document === 'undefined') return;
    
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const params = this.parseParams(element.getAttribute('data-i18n-params'));

      if (key) {
        const translation = this.t(key, params);

        if (element.tagName === 'INPUT' && element.type === 'placeholder') {
          element.placeholder = translation;
        } else if (element.hasAttribute('data-i18n-attr')) {
          const attr = element.getAttribute('data-i18n-attr');
          element.setAttribute(attr, translation);
        } else {
          element.textContent = translation;
        }
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      if (key) {
        element.title = this.t(key);
      }
    });
  }

  parseParams(paramsString) {
    if (!paramsString) return {};

    try {
      return JSON.parse(paramsString);
    } catch (e) {
      const params = {};
      paramsString.split(',').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key.trim()] = value.trim();
        }
      });
      return params;
    }
  }

  announceLocaleChange(locale) {
    const localeNames = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'pt': 'Portuguese',
      'ru': 'Russian', 'it': 'Italian', 'ar': 'Arabic', 'hi': 'Hindi'
    };

    const message = `Language changed to ${localeNames[locale] || locale.toUpperCase()}`;

    if (typeof window !== 'undefined' && window.accessibilityManager) {
      window.accessibilityManager.announce(message);
    }
  }

  // Utility Functions
  getCurrentLocale() {
    return this.currentLocale;
  }

  getSupportedLocales() {
    return [...this.supportedLocales];
  }

  isRTLLocale(locale = this.currentLocale) {
    return this.rtlLanguages.includes(locale.split('-')[0]);
  }

  formatNumber(number, options = {}) {
    try {
      return new Intl.NumberFormat(this.currentLocale, options).format(number);
    } catch (e) {
      return number.toString();
    }
  }

  formatDate(date, options = {}) {
    try {
      return new Intl.DateTimeFormat(this.currentLocale, options).format(date);
    } catch (e) {
      return date.toLocaleDateString();
    }
  }

  formatTime(date, options = {}) {
    try {
      return new Intl.DateTimeFormat(this.currentLocale, {
        hour: 'numeric',
        minute: '2-digit',
        ...options
      }).format(date);
    } catch (e) {
      return date.toLocaleTimeString();
    }
  }

  pluralize(key, count, params = {}) {
    const pluralKey = `${key}_plural`;
    const singularKey = `${key}_singular`;

    if (count === 1 && this.has(singularKey)) {
      return this.t(singularKey, { ...params, count });
    } else if (count !== 1 && this.has(pluralKey)) {
      return this.t(pluralKey, { ...params, count });
    }

    return this.t(key, { ...params, count });
  }

  updateContent() {
    this.updateTranslatableElements();
  }

  setAutoDetect(enabled) {
    this.autoDetectEnabled = enabled;
    try {
      localStorage.setItem('sonu-auto-detect-lang', enabled ? 'true' : 'false');
    } catch (e) {}
  }

  isAutoDetectEnabled() {
    return this.autoDetectEnabled;
  }

  destroy() {
    this.translations = {};
    console.log('Internationalization destroyed');
  }
}

// Singleton instance
let i18nManagerInstance = null;

function getI18nManager() {
  if (!i18nManagerInstance) {
    i18nManagerInstance = new I18nManager();
  }
  return i18nManagerInstance;
}

function t(key, params = {}) {
  return getI18nManager().t(key, params);
}

// Make available globally
if (typeof window !== 'undefined') {
  window.I18nManager = I18nManager;
  window.getI18nManager = getI18nManager;
  window.t = t;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18nManager, getI18nManager, t };
}
