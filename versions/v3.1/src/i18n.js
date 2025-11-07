/**
 * Internationalization (i18n) System for SONU
 * Multi-language UI support with locale detection and dynamic loading
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

    this.initialize();
  }

  initialize() {
    if (!this.isEnabled) return;

    this.detectUserLocale();
    this.loadTranslations(this.currentLocale);
    this.setupLocaleSwitcher();
    this.applyLocale();

    console.log(`Internationalization initialized with locale: ${this.currentLocale}`);
  }

  // Locale Detection
  detectUserLocale() {
    // Priority order for locale detection:
    // 1. User preference from settings
    // 2. Browser language
    // 3. System locale
    // 4. Fallback to English

    // Check saved preference
    const savedLocale = localStorage.getItem('sonu-locale');
    if (savedLocale && this.supportedLocales.includes(savedLocale)) {
      this.currentLocale = savedLocale;
      return;
    }

    // Detect browser language
    const browserLang = this.detectBrowserLanguage();
    if (browserLang && this.supportedLocales.includes(browserLang)) {
      this.currentLocale = browserLang;
      return;
    }

    // Try language without region (e.g., 'en' from 'en-US')
    const baseLang = browserLang?.split('-')[0];
    if (baseLang && this.supportedLocales.includes(baseLang)) {
      this.currentLocale = baseLang;
      return;
    }

    // Fallback to English
    this.currentLocale = this.fallbackLocale;
  }

  detectBrowserLanguage() {
    // Get browser language with fallbacks
    return navigator.language ||
           navigator.userLanguage ||
           navigator.browserLanguage ||
           navigator.systemLanguage ||
           'en';
  }

  // Translation Loading
  async loadTranslations(locale) {
    try {
      // Try to load translation file first
      const response = await fetch(`locales/${locale}.json`);
      if (response.ok) {
        this.translations[locale] = await response.json();
        return;
      }
      
      // Try base language if region-specific fails
      const baseLang = locale.split('-')[0];
      if (baseLang !== locale) {
        const baseResponse = await fetch(`locales/${baseLang}.json`);
        if (baseResponse.ok) {
          this.translations[locale] = await baseResponse.json();
          return;
        }
      }
      
      // If no translation file exists, use translation service
      // Load English translations first as source
      let sourceTranslations = {};
      try {
        const enResponse = await fetch(`locales/en.json`);
        if (enResponse.ok) {
          sourceTranslations = await enResponse.json();
        } else {
          sourceTranslations = this.getFallbackTranslations('en');
        }
      } catch (e) {
        sourceTranslations = this.getFallbackTranslations('en');
      }
      
      // Translate using Python service if available
      if (locale !== 'en' && typeof window !== 'undefined' && window.voiceApp && window.voiceApp.translateDict) {
        try {
          const result = await window.voiceApp.translateDict(sourceTranslations, locale, 'en');
          if (result && result.translated && !result.error) {
            this.translations[locale] = result.translated;
            console.log(`Translations loaded for ${locale} using translation service`);
            return;
          }
        } catch (error) {
          console.warn(`Translation service failed for ${locale}:`, error);
        }
      }
      
      // Fallback to English if translation service fails
      this.translations[locale] = sourceTranslations;
    } catch (error) {
      console.warn(`Failed to load translations for ${locale}:`, error);
      // Use fallback translations
      this.translations[locale] = this.getFallbackTranslations(locale);
    }
  }

  getFallbackTranslations(locale) {
    // Provide minimal fallback translations
    return {
      // Common UI elements
      'app.name': 'SONU',
      'app.description': 'Offline Voice Typing Application',
      'nav.home': 'Home',
      'nav.history': 'History',
      'nav.settings': 'Settings',
      'button.save': 'Save',
      'button.cancel': 'Cancel',
      'button.close': 'Close',
      'status.loading': 'Loading...',
      'error.generic': 'An error occurred',

      // Dictation related
      'dictation.title': 'Speak anywhere',
      'dictation.description': 'SONU works in all your apps. Try it in email, messages, docs or anywhere else.',
      'dictation.hotkey': 'Hold down the {hotkey} key, speak, and let go to insert spoken text.',

      // Settings
      'settings.title': 'Settings',
      'settings.general': 'General',
      'settings.system': 'System',
      'settings.model': 'Model Selector',
      'settings.themes': 'Themes',

      // Messages
      'message.copied': 'Copied to clipboard',
      'message.saved': 'Settings saved successfully',
      'message.error': 'An error occurred'
    };
  }

  // Translation Functions
  t(key, params = {}) {
    const locale = this.currentLocale;
    const translations = this.translations[locale] || this.translations[this.fallbackLocale] || {};

    let text = translations[key] || key;

    // Replace parameters
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`{${param}}`, 'g'), value);
    });

    return text;
  }

  // Check if translation exists
  has(key) {
    const locale = this.currentLocale;
    const translations = this.translations[locale] || this.translations[this.fallbackLocale] || {};
    return key in translations;
  }

  // Set current locale
  async setLocale(locale) {
    if (!this.supportedLocales.includes(locale)) {
      console.warn(`Unsupported locale: ${locale}`);
      return false;
    }

    // Load translations if not already loaded
    if (!this.translations[locale]) {
      await this.loadTranslations(locale);
    }

    this.currentLocale = locale;
    localStorage.setItem('sonu-locale', locale);

    // Apply locale immediately
    this.applyLocale();
    this.announceLocaleChange(locale);
    
    // Also update content after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.updateContent();
    }, 100);

    return true;
  }

  // Apply locale to UI
  applyLocale() {
    const locale = this.currentLocale;

    // Set document language
    document.documentElement.lang = locale;

    // Set text direction
    const isRTL = this.rtlLanguages.includes(locale.split('-')[0]);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', isRTL);

    // Update all translatable elements
    this.updateTranslatableElements();

    // Update page title
    document.title = this.t('app.name') + ' - ' + this.t('app.description');

    // Emit locale change event
    window.dispatchEvent(new CustomEvent('localeChanged', {
      detail: { locale, isRTL }
    }));
  }

  updateTranslatableElements() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const params = this.parseParams(element.getAttribute('data-i18n-params'));

      if (key) {
        const translation = this.t(key, params);

        // Update based on element type
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

    // Update elements with data-i18n-title attribute
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
      // Simple key=value parsing
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

  // Locale Switcher
  setupLocaleSwitcher() {
    // Create locale switcher element
    const switcher = document.createElement('select');
    switcher.id = 'locale-switcher';
    switcher.className = 'locale-switcher';
    switcher.setAttribute('aria-label', 'Select language');

    // Add supported locales
    const localeNames = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'pt': 'Português',
      'ru': 'Русский',
      'it': 'Italiano',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk',
      'fi': 'Suomi'
    };

    this.supportedLocales.forEach(locale => {
      const option = document.createElement('option');
      option.value = locale;
      option.textContent = localeNames[locale] || locale.toUpperCase();
      if (locale === this.currentLocale) {
        option.selected = true;
      }
      switcher.appendChild(option);
    });

    // Add change listener
    switcher.addEventListener('change', async (e) => {
      const newLocale = e.target.value;
      await this.setLocale(newLocale);
    });

    // Add to settings page
    const settingsContainer = document.querySelector('.settings-container');
    if (settingsContainer) {
      const switcherContainer = document.createElement('div');
      switcherContainer.className = 'locale-switcher-container';
      switcherContainer.innerHTML = '<label for="locale-switcher">Language:</label>';
      switcherContainer.appendChild(switcher);

      // Add to general settings
      const generalSettings = document.getElementById('settings-general');
      if (generalSettings) {
        const card = document.createElement('div');
        card.className = 'settings-card';
        card.innerHTML = `
          <div class="settings-card-content">
            <div class="settings-card-info">
              <h3 class="settings-card-title" data-i18n="settings.language">Language</h3>
              <p class="settings-card-desc" data-i18n="settings.language.description">Choose your preferred language for the interface</p>
            </div>
            <div class="locale-switcher-wrapper">
              ${switcherContainer.innerHTML}
            </div>
          </div>
        `;
        generalSettings.appendChild(card);

        // Re-attach event listener to the new switcher
        const newSwitcher = card.querySelector('#locale-switcher');
        if (newSwitcher) {
          newSwitcher.addEventListener('change', async (e) => {
            const newLocale = e.target.value;
            await this.setLocale(newLocale);
          });
        }
      }
    }
  }

  // Announcements
  announceLocaleChange(locale) {
    const localeNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean'
    };

    const message = `Language changed to ${localeNames[locale] || locale.toUpperCase()}`;

    // Announce to screen readers if available
    if (window.accessibilityManager) {
      window.accessibilityManager.announce(message);
    }

    // Show toast notification
    this.showToast(message);
  }

  showToast(message) {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--accent-purple, #7c5cff);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
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

  // Format numbers and dates according to locale
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

  // Pluralization support
  pluralize(key, count, params = {}) {
    const locale = this.currentLocale;

    // Check for plural forms
    const pluralKey = `${key}_plural`;
    const singularKey = `${key}_singular`;

    if (count === 1 && this.has(singularKey)) {
      return this.t(singularKey, { ...params, count });
    } else if (count !== 1 && this.has(pluralKey)) {
      return this.t(pluralKey, { ...params, count });
    }

    // Fallback to regular key
    return this.t(key, { ...params, count });
  }

  // Dynamic content updates
  updateContent() {
    this.updateTranslatableElements();
  }

  // Cleanup
  destroy() {
    // Remove event listeners
    const switcher = document.getElementById('locale-switcher');
    if (switcher) {
      switcher.removeEventListener('change', this.setLocale);
    }

    // Clear translations cache
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

// Global helper function
function t(key, params = {}) {
  return getI18nManager().t(key, params);
}

// Make available globally
window.I18nManager = I18nManager;
window.getI18nManager = getI18nManager;
window.t = t; // Global translation helper

module.exports = { I18nManager, getI18nManager, t };