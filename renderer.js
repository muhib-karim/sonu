// Performance monitoring integration (optional - gracefully handle if not available)
let performanceMonitor = null;
try {
  if (typeof require !== 'undefined') {
const { getPerformanceMonitor } = require('./src/performance_monitor.js');
    performanceMonitor = getPerformanceMonitor();

// Initialize performance monitoring
document.addEventListener('DOMContentLoaded', () => {
      if (performanceMonitor) {
  performanceMonitor.loadMetrics();

  // Record page load performance
  if (performance.timing) {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    performanceMonitor.recordUIRenderTime(loadTime);
        }
  }
});

// Add performance monitoring to key interactions
document.addEventListener('click', (event) => {
      if (performanceMonitor) {
  const startTime = performance.now();

  // Use setTimeout to measure interaction latency
  setTimeout(() => {
    const latency = performance.now() - startTime;
    performanceMonitor.recordInteractionLatency(latency);
  }, 0);
      }
});

// Error handling with performance monitoring
window.addEventListener('error', (event) => {
      if (performanceMonitor) {
  performanceMonitor.recordError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
      }
});

window.addEventListener('unhandledrejection', (event) => {
      if (performanceMonitor) {
  performanceMonitor.recordError(event.reason, {
    type: 'unhandled_promise_rejection'
  });
      }
});
  }
} catch (e) {
  console.warn('Performance monitoring not available:', e.message);
}
// Make performance monitor available globally for debugging
window.performanceMonitor = performanceMonitor;

// Internationalization integration (optional - gracefully handle if not available)
let i18nManager = null;
let t = (key, params) => key; // Fallback translation function
try {
  if (typeof require !== 'undefined') {
    const i18nModule = require('./src/i18n.js');
    i18nManager = i18nModule.getI18nManager();
    t = i18nModule.t || t;

// Initialize internationalization
document.addEventListener('DOMContentLoaded', () => {
      if (i18nManager) {
  // Update initial content with translations
  setTimeout(() => {
    i18nManager.updateContent();
  }, 100);
      }
});

// Listen for locale changes
window.addEventListener('localeChanged', (event) => {
      if (i18nManager) {
  const { locale, isRTL } = event.detail;
  console.log(`Locale changed to: ${locale}, RTL: ${isRTL}`);

  // Update any dynamic content that needs refreshing
        if (typeof updateDictationBoxHotkey === 'function') {
  updateDictationBoxHotkey();
        }
        if (typeof updateKeyboardShortcutsDisplay === 'function') {
  updateKeyboardShortcutsDisplay();
        }
      }
});
  }
} catch (e) {
  console.warn('Internationalization not available:', e.message);
}
// Make i18n manager available globally for debugging
window.i18nManager = i18nManager;
window.t = t;

// Accessibility integration (optional - gracefully handle if not available)
let accessibilityManager = null;
try {
  if (typeof require !== 'undefined') {
const { getAccessibilityManager } = require('./src/accessibility.js');
    accessibilityManager = getAccessibilityManager();

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
      if (accessibilityManager) {
  // Announce page load to screen readers
  setTimeout(() => {
    accessibilityManager.announce('SONU voice typing application loaded. Press Tab to navigate.');
  }, 1000);
      }
    });
  }
} catch (e) {
  console.warn('Accessibility features not available:', e.message);
}
// Make accessibility manager available globally for debugging
window.accessibilityManager = accessibilityManager;
(() => {
  // IPC API
  const ipc = window.voiceApp || {
    onTranscription: () => {},
    onRecordingStart: () => {},
    onRecordingStop: () => {},
    toggleRecording: () => {},
    getSettings: async () => ({ holdHotkey: 'CommandOrControl+Super+Space', toggleHotkey: 'CommandOrControl+Shift+Space' }),
    saveSettings: async (s) => s,
    onHotkeyRegistered: () => {},
    onHotkeyError: () => {},
    startCaptureHotkey: () => {},
    endCaptureHotkey: () => {},
    getHistory: async () => [],
    clearHistory: async () => {},
    saveHistory: async () => false,
    deleteHistoryItem: async () => false,
    onHistoryAppend: () => {},
    copyToClipboard: (text) => {
      // Fallback: try to use navigator.clipboard if available
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          console.error('Failed to copy to clipboard');
        });
      } else {
        console.error('Clipboard API not available');
      }
    },
    onShowMessage: () => {},
    onFocusHoldHotkey: () => {},
    onFocusToggleHotkey: () => {},
    onTranscriptionPartial: () => {},
    getSystemInfo: async () => null,
    getSuggestedModel: async () => 'base',
    downloadModel: async () => ({ success: false }),
    checkModel: async () => ({ exists: false }),
    getModelSpace: async () => 0,
    onModelProgress: () => {},
    onModelComplete: () => {},
    onModelError: () => {},
    getAppSettings: async () => ({}),
    saveAppSettings: async () => ({}),
    clearCache: async () => ({}),
    listMicrophones: async () => [],
    onPlaySound: () => {},
    getSystemTheme: async () => 'light',
    onSystemThemeChanged: () => {},
    setThemeSource: () => {},
    // Dictionary
    getDictionary: async () => [],
    addDictionaryWord: async () => ({ success: false, words: [] }),
    updateDictionaryWord: async () => ({ success: false, words: [] }),
    deleteDictionaryWord: async () => [],
    // Snippets
    getSnippets: async () => [],
    addSnippet: async () => [],
    updateSnippet: async () => [],
    deleteSnippet: async () => [],
    // Notes
    getNotes: async () => [],
    addNote: async () => [],
    updateNote: async () => [],
    deleteNote: async () => []
  };

  // State
  let isListening = false;
  let currentPage = 'home';
  let currentSettingsPage = 'general';
  let editingHistoryItem = null;
  let stats = {
    totalTime: 0, // in seconds
    words: 0,
    wpm: 0,
    timeSaved: 0 // in seconds (estimated based on typing speed)
  };
  
  let recordingStartTime = null;
  let recordingDurations = []; // Track durations for WPM calculation
  let whisperModelReady = false; // Track if whisper model is ready
  let modelLoadStartTime = Date.now(); // Track model load time
  let activeDownloads = new Map(); // Track active downloads with their cancel functions

  // Elements - wrapped in try-catch to ensure basic functionality works
  let navItems, pages, settingsNavItems, settingsPages, historyList, livePreview, livePreviewText, statTime, statWords, statSaved, statWpm, historyListFull;
  
  try {
    navItems = document.querySelectorAll('.nav-item[data-page]');
    pages = document.querySelectorAll('.page');
    settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
    settingsPages = document.querySelectorAll('.settings-page');
    historyList = document.getElementById('history-list');
    historyListFull = document.getElementById('history-list-full');
    livePreview = document.getElementById('live-preview');
    livePreviewText = document.getElementById('live-preview-text');
    statTime = document.getElementById('stat-time');
    statWords = document.getElementById('stat-words');
    statSaved = document.getElementById('stat-saved');
    statWpm = document.getElementById('stat-wpm');
    
    console.log('Elements loaded:', {
      navItems: navItems.length,
      pages: pages.length,
      settingsNavItems: settingsNavItems.length,
      settingsPages: settingsPages.length
    });
  } catch (e) {
    console.error('Error loading DOM elements:', e);
    // Set defaults to prevent errors
    navItems = [];
    pages = [];
    settingsNavItems = [];
    settingsPages = [];
  }

  // Navigation - simple and reliable setup
  let navigationSetup = false;
  function setupNavigation() {
    try {
      // Re-query elements every time to ensure we get the latest
      navItems = document.querySelectorAll('.nav-item[data-page]');
      pages = document.querySelectorAll('.page');
      
      if (navItems.length === 0) {
        console.warn('No navigation items found, will retry...');
        return;
      }
      
      console.log('Setting up navigation. Nav items:', navItems.length, 'Pages:', pages.length);
      
      // Remove old listeners by cloning nodes (prevents duplicate listeners)
      navItems.forEach((item) => {
        // Clone the node to remove all event listeners
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Add fresh event listener
        newItem.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const page = this.dataset.page;
            console.log('Navigation clicked:', page);
            if (page) {
              navigateToPage(page);
            }
          } catch (err) {
            console.error('Error in navigation click handler:', err);
          }
        });
      });
      
      // Update navItems reference to the new cloned elements
      navItems = document.querySelectorAll('.nav-item[data-page]');
      
      navigationSetup = true;
      console.log('Navigation setup complete');
    } catch (e) {
      console.error('Error setting up navigation:', e);
      navigationSetup = false; // Allow retry
    }
  }

  function navigateToPage(page) {
    if (!page) {
      console.error('No page specified for navigation');
      return;
    }
    
    console.log('Navigating to page:', page);
    currentPage = page;
    
    try {
      // Re-query if needed
      if (!navItems || navItems.length === 0) {
        navItems = document.querySelectorAll('.nav-item[data-page]');
      }
      if (!pages || pages.length === 0) {
        pages = document.querySelectorAll('.page');
      }
      
      // Update nav items
      navItems.forEach(nav => {
        if (nav && nav.dataset) {
          nav.classList.toggle('active', nav.dataset.page === page);
        }
      });
      
      // Update pages
      pages.forEach(p => {
        if (p && p.id) {
          const expectedId = `page-${page}`;
          p.classList.toggle('active', p.id === expectedId);
        }
      });
      
      console.log('Navigation complete. Current page:', currentPage);
      
      // Load data when navigating to tabs
      if (page === 'home') {
        loadHistory(); // Load history on home page
        calculateStatsFromHistory(); // Calculate stats from history
      } else if (page === 'dictionary') {
        loadDictionary();
      } else if (page === 'snippets') {
        loadSnippets();
      } else if (page === 'notes') {
        loadNotes();
      }
    } catch (e) {
      console.error('Error in navigateToPage:', e);
    }
  }

  // Settings Navigation - simple and reliable setup
  let settingsNavigationSetup = false;
  function setupSettingsNavigation() {
    try {
      // Re-query elements every time to ensure we get the latest
      settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
      settingsPages = document.querySelectorAll('.settings-page');
      
      if (settingsNavItems.length === 0) {
        console.warn('No settings navigation items found, will retry...');
        return;
      }
      
      console.log('Setting up settings navigation. Nav items:', settingsNavItems.length, 'Pages:', settingsPages.length);
      
      // Remove old listeners by cloning nodes (prevents duplicate listeners)
      settingsNavItems.forEach((item) => {
        // Clone the node to remove all event listeners
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Add fresh event listener
        newItem.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const page = this.dataset.settingsPage;
            console.log('Settings navigation clicked:', page);
            if (page) {
              navigateToSettingsPage(page);
            }
          } catch (err) {
            console.error('Error in settings navigation click handler:', err);
          }
        });
      });
      
      // Update settingsNavItems reference to the new cloned elements
      settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
      
      settingsNavigationSetup = true;
      console.log('Settings navigation setup complete');
    } catch (e) {
      console.error('Error setting up settings navigation:', e);
      settingsNavigationSetup = false; // Allow retry
    }
  }

  function navigateToSettingsPage(page) {
    if (!page) {
      console.error('No settings page specified for navigation');
      return;
    }
    
    console.log('Navigating to settings page:', page);
    currentSettingsPage = page;
    
    // First, navigate to settings page if not already there
    if (currentPage !== 'settings') {
      navigateToPage('settings');
    }
    
    try {
      // Re-query if needed
      if (!settingsNavItems || settingsNavItems.length === 0) {
        settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
      }
      if (!settingsPages || settingsPages.length === 0) {
        settingsPages = document.querySelectorAll('.settings-page');
      }
      
      // Update nav items
      settingsNavItems.forEach(nav => {
        if (nav && nav.dataset) {
          nav.classList.toggle('active', nav.dataset.settingsPage === page);
        }
      });
      
      // Update pages
      settingsPages.forEach(p => {
        if (p && p.id) {
          const expectedId = `settings-${page}`;
          p.classList.toggle('active', p.id === expectedId);
        }
      });
      
      // Load system info when System tab is opened
      if (page === 'system') {
        setTimeout(loadSystemInfo, 100);
      }
      
      // Load model selector when Model tab is opened (only once)
      if (page === 'model') {
        setTimeout(() => loadModelSelector(), 100);
      }
      
      // Initialize theme gallery when Themes tab is opened
      if (page === 'themes') {
        setTimeout(() => initializeThemeGallery(), 100);
      }
      
      console.log('Settings navigation complete. Current settings page:', currentSettingsPage);
    } catch (e) {
      console.error('Error in navigateToSettingsPage:', e);
    }
  }

  // Modals
  const modals = document.querySelectorAll('.modal');
  const modalTriggers = {
    'change-shortcuts-btn': 'shortcuts-modal',
    'change-microphone-btn': 'microphone-modal',
    'change-language-btn': 'language-modal'
  };

  Object.entries(modalTriggers).forEach(([triggerId, modalId]) => {
    const trigger = document.getElementById(triggerId);
    if (trigger) {
      trigger.addEventListener('click', () => openModal(modalId));
    }
  });

  document.querySelectorAll('.modal-close, .btn-secondary[data-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
      if (modalId) closeModal(modalId);
    });
  });

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      
      // Load current values
      if (modalId === 'shortcuts-modal') {
        ipc.getSettings().then(s => {
          document.getElementById('modal-hold-hotkey').value = s.holdHotkey || 'CommandOrControl+Super+Space';
          document.getElementById('modal-toggle-hotkey').value = s.toggleHotkey || 'CommandOrControl+Shift+Space';
        });
      }
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  // Hotkey capture for modal inputs
  const modalHoldHotkey = document.getElementById('modal-hold-hotkey');
  const modalToggleHotkey = document.getElementById('modal-toggle-hotkey');
  
  if (modalHoldHotkey) {
    modalHoldHotkey.addEventListener('focus', () => {
      ipc.startCaptureHotkey();
    });
    modalHoldHotkey.addEventListener('blur', () => {
      ipc.endCaptureHotkey();
    });
    modalHoldHotkey.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey && !e.ctrlKey) parts.push('Win');
      const mainKey = e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      if (mainKey && mainKey !== 'Enter' && mainKey !== 'Tab') {
        parts.push(mainKey);
        modalHoldHotkey.value = parts.join('+');
      }
      if (e.key === 'Enter') modalHoldHotkey.blur();
    });
  }
  
  if (modalToggleHotkey) {
    modalToggleHotkey.addEventListener('focus', () => {
      ipc.startCaptureHotkey();
    });
    modalToggleHotkey.addEventListener('blur', () => {
      ipc.endCaptureHotkey();
    });
    modalToggleHotkey.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey && !e.ctrlKey) parts.push('Win');
      const mainKey = e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
      if (mainKey && mainKey !== 'Enter' && mainKey !== 'Tab') {
        parts.push(mainKey);
        modalToggleHotkey.value = parts.join('+');
      }
      if (e.key === 'Enter') modalToggleHotkey.blur();
    });
  }

  // Save shortcuts
  document.getElementById('save-shortcuts-btn')?.addEventListener('click', async () => {
    const holdHotkey = document.getElementById('modal-hold-hotkey').value.trim();
    const toggleHotkey = document.getElementById('modal-toggle-hotkey').value.trim();
    
    // Ensure hotkeys are unregistered before saving
    ipc.endCaptureHotkey();
    
    await ipc.saveSettings({ holdHotkey, toggleHotkey });
    closeModal('shortcuts-modal');
    showMessage('Shortcuts saved successfully');
    // Update dictation box with new hotkey
    updateDictationBoxHotkey();
  });

  // Save microphone
  document.getElementById('save-microphone-btn')?.addEventListener('click', () => {
    const selected = document.getElementById('microphone-select').value;
    document.getElementById('microphone-desc').textContent = selected;
    closeModal('microphone-modal');
    showMessage('Microphone settings saved');
  });

  // Language names mapping
  const languageNames = {
    en: 'English',
    es: 'Español (Spanish)',
    fr: 'Français (French)',
    de: 'Deutsch (German)',
    zh: '中文 (Chinese)',
    ja: '日本語 (Japanese)',
    ko: '한국어 (Korean)',
    pt: 'Português (Portuguese)',
    ru: 'Русский (Russian)',
    it: 'Italiano (Italian)',
    nl: 'Nederlands (Dutch)',
    sv: 'Svenska (Swedish)',
    da: 'Dansk (Danish)',
    no: 'Norsk (Norwegian)',
    fi: 'Suomi (Finnish)',
    pl: 'Polski (Polish)',
    tr: 'Türkçe (Turkish)',
    ar: 'العربية (Arabic)',
    he: 'עברית (Hebrew)',
    hi: 'हिन्दी (Hindi)',
    th: 'ไทย (Thai)',
    vi: 'Tiếng Việt (Vietnamese)',
    id: 'Bahasa Indonesia (Indonesian)',
    ms: 'Bahasa Melayu (Malay)',
    cs: 'Čeština (Czech)',
    sk: 'Slovenčina (Slovak)',
    hu: 'Magyar (Hungarian)',
    ro: 'Română (Romanian)',
    bg: 'Български (Bulgarian)',
    hr: 'Hrvatski (Croatian)',
    sr: 'Српски (Serbian)',
    uk: 'Українська (Ukrainian)',
    el: 'Ελληνικά (Greek)',
    ca: 'Català (Catalan)',
    eu: 'Euskara (Basque)',
    ga: 'Gaeilge (Irish)',
    cy: 'Cymraeg (Welsh)'
  };

  // Initialize i18n system
  let i18nManager = null;
  try {
    // Try to load i18n manager if available
    if (typeof I18nManager !== 'undefined') {
      i18nManager = new I18nManager();
    } else {
      // Fallback: create a simple i18n manager
      i18nManager = {
        currentLocale: 'en',
        translations: {},
        async setLocale(locale) {
          this.currentLocale = locale;
          localStorage.setItem('sonu-locale', locale);
          // Load translations
          try {
            const response = await fetch(`locales/${locale}.json`);
            if (response.ok) {
              this.translations[locale] = await response.json();
            } else {
              // Fallback to English if translation not available
              const enResponse = await fetch(`locales/en.json`);
              if (enResponse.ok) {
                this.translations[locale] = await enResponse.json();
              }
            }
          } catch (e) {
            console.warn('Failed to load translations:', e);
            // Use English as fallback
            try {
              const enResponse = await fetch(`locales/en.json`);
              if (enResponse.ok) {
                this.translations[locale] = await enResponse.json();
              }
            } catch (e2) {
              console.error('Failed to load English translations:', e2);
            }
          }
          // Apply translations
          this.applyLocale();
          return true;
        },
        applyLocale() {
          // Update all elements with data-i18n attribute
          document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key && this.translations[this.currentLocale]) {
              const keys = key.split('.');
              let value = this.translations[this.currentLocale];
              for (const k of keys) {
                value = value?.[k];
              }
              if (value) {
                element.textContent = value;
              }
            }
          });
          // Update document language
          document.documentElement.lang = this.currentLocale;
          // Set RTL for RTL languages
          const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
          if (rtlLanguages.includes(this.currentLocale)) {
            document.documentElement.dir = 'rtl';
            document.body.classList.add('rtl');
          } else {
            document.documentElement.dir = 'ltr';
            document.body.classList.remove('rtl');
          }
        },
        t(key, params = {}) {
          if (!this.translations[this.currentLocale]) {
            return key;
          }
          const keys = key.split('.');
          let value = this.translations[this.currentLocale];
          for (const k of keys) {
            value = value?.[k];
          }
          if (typeof value === 'string') {
            // Simple parameter replacement
            return value.replace(/\{(\w+)\}/g, (match, param) => {
              return params[param] || match;
            });
          }
          return value || key;
        }
      };
      // Load initial locale
      const savedLocale = localStorage.getItem('sonu-locale') || 'en';
      i18nManager.setLocale(savedLocale);
    }
  } catch (e) {
    console.error('Failed to initialize i18n:', e);
    // Create minimal fallback
    i18nManager = {
      currentLocale: 'en',
      translations: {},
      async setLocale(locale) {
        this.currentLocale = locale;
        localStorage.setItem('sonu-locale', locale);
        return true;
      },
      applyLocale() {},
      t(key) { return key; }
    };
  }

  // Save language
  const saveLanguageBtn = document.getElementById('save-language-btn');
  if (saveLanguageBtn) {
    saveLanguageBtn.addEventListener('click', async () => {
    const selected = document.getElementById('language-select').value;
      
      // Save to settings
      await saveAppSettings({ app_language: selected });
      
      // Update i18n system
      if (i18nManager) {
        await i18nManager.setLocale(selected);
      }
      
      // Update display
      const languageDesc = document.getElementById('language-desc');
      if (languageDesc) {
        languageDesc.textContent = languageNames[selected] || 'English';
      }
      
    closeModal('language-modal');
    showMessage('Language settings saved');
      
      // Reload page to apply all translations
      setTimeout(() => {
        window.location.reload();
      }, 500);
    });
  }

  // Load current language on page load
  const loadCurrentLanguage = async () => {
    try {
      const settings = await ipc.getAppSettings();
      const currentLang = settings.app_language || settings.language || 'en';
      
      // Set language select
      const languageSelect = document.getElementById('language-select');
      if (languageSelect) {
        languageSelect.value = currentLang;
      }
      
      // Update description
      const languageDesc = document.getElementById('language-desc');
      if (languageDesc) {
        languageDesc.textContent = languageNames[currentLang] || 'English';
      }
      
      // Set i18n locale
      if (i18nManager) {
        await i18nManager.setLocale(currentLang);
      }
    } catch (e) {
      console.error('Error loading current language:', e);
    }
  };
  
  // Load language when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCurrentLanguage);
  } else {
    loadCurrentLanguage();
  }

  // Waveform animation
  const waveformContainer = document.getElementById('waveform-container');
  const waveformCanvas = document.getElementById('waveform-canvas');
  let waveformAnimationId = null;
  let waveformData = [];
  
  function drawWaveform() {
    if (!waveformCanvas || !waveformContainer) return;
    
    const ctx = waveformCanvas.getContext('2d', { alpha: true });
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    const centerY = height / 2;
    
    // Get theme colors from CSS variables
    const root = document.documentElement;
    const accentPurple = getComputedStyle(root).getPropertyValue('--accent-purple').trim() || '#7c5cff';
    
    // Clear canvas with transparent background - ensure alpha channel is preserved
    ctx.clearRect(0, 0, width, height);
    
    // Ensure canvas background is transparent
    if (waveformCanvas.style) {
      waveformCanvas.style.backgroundColor = 'transparent';
    }
    
    // Generate waveform data if empty (more bars for smoother look)
    if (waveformData.length === 0) {
      const numBars = Math.floor(width / 4); // More bars for better visualization
      for (let i = 0; i < numBars; i++) {
        waveformData.push(Math.random() * 0.3 + 0.4);
      }
    }
    
    // Update waveform data with smooth animation
    for (let i = 0; i < waveformData.length; i++) {
      waveformData[i] += (Math.random() - 0.5) * 0.15;
      waveformData[i] = Math.max(0.3, Math.min(1, waveformData[i]));
    }
    
    // Draw waveform bars with rounded tops and nice colors
    const barWidth = Math.max(2, width / waveformData.length - 1);
    const spacing = 1;
    
    for (let i = 0; i < waveformData.length; i++) {
      const x = i * (barWidth + spacing);
      const amplitude = waveformData[i] * (height * 0.45);
      const y1 = centerY - amplitude;
      const y2 = centerY + amplitude;
      const barHeight = y2 - y1;
      
      // Create beautiful gradient for each bar
      const barGradient = ctx.createLinearGradient(x, y1, x, y2);
      const color1 = accentPurple || '#7c5cff';
      const color2 = color1.replace(')', ', 0.7)').replace('rgb', 'rgba').replace('#', 'rgba(124, 92, 255,');
      const color3 = color1.replace(')', ', 0.4)').replace('rgb', 'rgba').replace('#', 'rgba(124, 92, 255,');
      
      barGradient.addColorStop(0, color1);
      barGradient.addColorStop(0.5, color2 || color1);
      barGradient.addColorStop(1, color3 || color1);
      
      ctx.fillStyle = barGradient;
      
      // Draw rounded rectangle for each bar
      const radius = barWidth / 2;
      ctx.beginPath();
      ctx.moveTo(x + radius, y1);
      ctx.lineTo(x + barWidth - radius, y1);
      ctx.quadraticCurveTo(x + barWidth, y1, x + barWidth, y1 + radius);
      ctx.lineTo(x + barWidth, y2 - radius);
      ctx.quadraticCurveTo(x + barWidth, y2, x + barWidth - radius, y2);
      ctx.lineTo(x + radius, y2);
      ctx.quadraticCurveTo(x, y2, x, y2 - radius);
      ctx.lineTo(x, y1 + radius);
      ctx.quadraticCurveTo(x, y1, x + radius, y1);
      ctx.closePath();
      ctx.fill();
    }
  }
  
  function startWaveformAnimation() {
    if (waveformAnimationId) return;
    
    const waveformToggle = document.getElementById('waveform-toggle');
    if (!waveformToggle || !waveformToggle.checked) return;
    
    if (waveformContainer) {
      waveformContainer.style.display = 'flex';
    }
    
    function animate() {
      drawWaveform();
      waveformAnimationId = requestAnimationFrame(animate);
    }
    
    animate();
  }
  
  function stopWaveformAnimation() {
    if (waveformAnimationId) {
      cancelAnimationFrame(waveformAnimationId);
      waveformAnimationId = null;
    }
    
    if (waveformContainer) {
      waveformContainer.style.display = 'none';
    }
    
    // Reset waveform data
    waveformData = [];
  }

  // Recording handlers
  ipc.onRecordingStart(() => {
      isListening = true;
    recordingStartTime = Date.now();
    livePreview.style.display = 'block';
    livePreviewText.textContent = 'Listening...';
    
    // Start waveform animation if enabled
    startWaveformAnimation();
  });

  ipc.onRecordingStop(() => {
      isListening = false;
    
    // Track recording duration
    if (recordingStartTime) {
      const duration = (Date.now() - recordingStartTime) / 1000; // in seconds
      stats.totalTime += duration;
      recordingDurations.push(duration);
      recordingStartTime = null;
      updateStatsDisplay();
    }
    
    // Stop waveform animation
    stopWaveformAnimation();
    
    setTimeout(() => {
      livePreview.style.display = 'none';
      livePreviewText.textContent = '';
    }, 1000);
  });

  // Live transcription preview
  if (ipc.onTranscriptionPartial) {
    ipc.onTranscriptionPartial((text) => {
      if (text && isListening) {
        livePreviewText.textContent = text;
      }
    });
  }

  // Final transcription
  ipc.onTranscription((text) => {
    if (!text) return;
    
    // Hide live preview
    livePreview.style.display = 'none';
    
    // Add to history
    addHistoryItem(text);
    
    // Update stats
    updateStats(text);
  });

  // History management
  function addHistoryItem(text) {
    const now = new Date();
    const timeStr = formatTime(now);
    const entry = { text, time: timeStr, timestamp: now.getTime() };
    
    // Add to history list (home page)
    const historyListFull = document.getElementById('history-list-full');
    if (historyListFull) {
      // Check if we need to add a date header for today
      const today = new Date().toDateString();
      const existingHeaders = historyListFull.querySelectorAll('.history-title');
      let todayHeader = null;
      
      existingHeaders.forEach(header => {
        if (header.textContent === 'Today') {
          todayHeader = header;
        }
      });
      
      if (!todayHeader) {
        // Create today header
        const dateHeader = document.createElement('h3');
        dateHeader.className = 'history-title';
        dateHeader.textContent = 'Today';
        historyListFull.insertBefore(dateHeader, historyListFull.firstChild);
      }
    
    // Create history item element
    const item = createHistoryItem(entry);
      const firstItem = historyListFull.querySelector('.history-item');
      if (firstItem) {
        historyListFull.insertBefore(item, firstItem);
      } else {
        // Find today header and insert after it
        const todayHeaderEl = historyListFull.querySelector('.history-title');
        if (todayHeaderEl && todayHeaderEl.textContent === 'Today') {
          historyListFull.insertBefore(item, todayHeaderEl.nextSibling);
        } else {
          historyListFull.appendChild(item);
        }
      }
    }
    
    // Update stats
    updateStats(text);
  }

  function createHistoryItem(entry) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.timestamp = entry.timestamp;
    
    item.innerHTML = `
      <div class="history-time">${entry.time}</div>
      <div class="history-text-wrapper">
      <div class="history-text" contenteditable="false">${escapeHtml(entry.text)}</div>
      </div>
      <div class="history-actions">
        <button class="history-action-icon copy-icon" title="Copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="history-action-icon flag-icon" title="Flag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
            <line x1="4" y1="22" x2="4" y2="15"/>
          </svg>
        </button>
        <button class="history-action-icon more-icon" title="More options">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>
    `;
    
    // Copy functionality
    const copyBtn = item.querySelector('.copy-icon');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const textToCopy = entry.text || '';
          if (!textToCopy) {
            showMessage('Nothing to copy');
            return;
          }

          // Try Electron clipboard first
          if (ipc && ipc.copyToClipboard) {
            const result = ipc.copyToClipboard(textToCopy);
            if (result && typeof result.then === 'function') {
              // It's a promise (IPC fallback)
              result.then((res) => {
                if (res && res.success) {
                  showMessage('Copied');
                } else {
                  // Try navigator clipboard as fallback
                  tryNavigatorClipboard(textToCopy);
                }
              }).catch(() => {
                tryNavigatorClipboard(textToCopy);
              });
            } else {
              // Synchronous call succeeded
              showMessage('Copied');
            }
          } else {
            tryNavigatorClipboard(textToCopy);
          }
        } catch (error) {
          console.error('Error copying to clipboard:', error);
          showMessage('Failed to copy');
        }

        function tryNavigatorClipboard(text) {
          if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
              showMessage('Copied');
            }).catch((err) => {
              console.error('Navigator clipboard error:', err);
              showMessage('Failed to copy');
            });
          } else {
            showMessage('Copy not available');
          }
        }
      });
    }
    
    // Flag functionality
    const flagBtn = item.querySelector('.flag-icon');
    if (flagBtn) {
      flagBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const wasFlagged = item.classList.contains('flagged');
        item.classList.toggle('flagged');
        const isFlagged = item.classList.contains('flagged');
        showMessage(isFlagged ? 'Flagged' : 'Unflagged');
      });
    }
    
    // More options functionality
    const moreBtn = item.querySelector('.more-icon');
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Show context menu or dropdown
      showHistoryContextMenu(item, entry, e);
    });
    
    // Double-click to edit
    const textEl = item.querySelector('.history-text');
    textEl.addEventListener('dblclick', () => {
      if (editingHistoryItem) {
        cancelEdit(editingHistoryItem);
      }
      
      item.classList.add('editing');
      textEl.contentEditable = 'true';
      textEl.classList.add('editable');
      textEl.focus();
      
      // Store original text
      textEl.dataset.originalText = textEl.textContent;
      
      // Track if we're handling a keydown to prevent blur from firing
      let handlingKeyDown = false;
      
      // Add Enter key handler to save
      const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          handlingKeyDown = true;
          // Remove listeners first
          textEl.removeEventListener('keydown', handleKeyDown);
          textEl.removeEventListener('blur', handleBlur);
          // Save the edit
          saveEdit(item, textEl);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          handlingKeyDown = true;
          // Remove listeners first
          textEl.removeEventListener('keydown', handleKeyDown);
          textEl.removeEventListener('blur', handleBlur);
          // Cancel the edit
          cancelEdit(item);
        }
      };
      
      // Add blur handler to save when clicking away
      const handleBlur = (e) => {
        // Don't save if we're handling a keydown event
        if (handlingKeyDown) {
          handlingKeyDown = false;
          return;
        }
        // Don't save if clicking context menu
        if (e && e.relatedTarget && e.relatedTarget.closest('.context-menu-item')) {
          return;
        }
        textEl.removeEventListener('keydown', handleKeyDown);
        textEl.removeEventListener('blur', handleBlur);
        saveEdit(item, textEl);
      };
      
      textEl.addEventListener('keydown', handleKeyDown);
      textEl.addEventListener('blur', handleBlur);
      
      editingHistoryItem = item;
    });
    
    return item;
  }

  function showHistoryContextMenu(item, entry, event) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.history-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }
    
    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'history-context-menu';
    menu.innerHTML = `
      <button class="context-menu-item" data-action="edit">Edit</button>
      <button class="context-menu-item" data-action="delete">Delete</button>
      <button class="context-menu-item" data-action="copy">Copy</button>
    `;
    
    document.body.appendChild(menu);
    
    // Get menu dimensions
    const menuRect = menu.getBoundingClientRect();
    const menuWidth = menuRect.width;
    const menuHeight = menuRect.height;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate initial position
    let left = event.clientX;
    let top = event.clientY;
    
    // Adjust horizontal position to stay within viewport
    if (left + menuWidth > viewportWidth) {
      // Position to the left of the click point
      left = event.clientX - menuWidth;
      // Ensure it doesn't go off the left edge
      if (left < 0) {
        left = 8; // Small margin from left edge
      }
    } else {
      // Add small margin from right edge if near the edge
      if (left + menuWidth > viewportWidth - 8) {
        left = viewportWidth - menuWidth - 8;
      }
    }
    
    // Adjust vertical position to stay within viewport
    if (top + menuHeight > viewportHeight) {
      // Position above the click point
      top = event.clientY - menuHeight;
      // Ensure it doesn't go off the top edge
      if (top < 0) {
        top = 8; // Small margin from top edge
      }
    } else {
      // Add small margin from bottom edge if near the edge
      if (top + menuHeight > viewportHeight - 8) {
        top = viewportHeight - menuHeight - 8;
      }
    }
    
    // Apply calculated position
    menu.style.position = 'fixed';
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.zIndex = '10000';
    
    // Handle menu actions
    menu.querySelectorAll('.context-menu-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        
        if (action === 'edit') {
          const textEl = item.querySelector('.history-text');
          if (editingHistoryItem) {
            cancelEdit(editingHistoryItem);
          }
          
        item.classList.add('editing');
        textEl.contentEditable = 'true';
        textEl.classList.add('editable');
        textEl.focus();
          
          // Store original text
          textEl.dataset.originalText = textEl.textContent;
      
          // Add Enter key handler to save
          const handleKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.stopPropagation();
              textEl.removeEventListener('keydown', handleKeyDown);
              textEl.removeEventListener('blur', handleBlur);
              saveEdit(item, textEl);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              textEl.removeEventListener('keydown', handleKeyDown);
              textEl.removeEventListener('blur', handleBlur);
              cancelEdit(item);
            }
          };
          
          // Add blur handler to save when clicking away
          const handleBlur = () => {
            textEl.removeEventListener('keydown', handleKeyDown);
            textEl.removeEventListener('blur', handleBlur);
            saveEdit(item, textEl);
          };
          
          textEl.addEventListener('keydown', handleKeyDown);
          textEl.addEventListener('blur', handleBlur, { once: true });
          
          editingHistoryItem = item;
        } else if (action === 'delete') {
          // Delete from history file
          deleteHistoryItem(entry.timestamp);
          item.remove();
          showMessage('Deleted');
          // Recalculate stats after deletion
          calculateStatsFromHistory();
        } else if (action === 'copy') {
          try {
            const textToCopy = entry.text || '';
            if (!textToCopy) {
              showMessage('Nothing to copy');
              return;
            }

            // Try Electron clipboard first
            if (ipc && ipc.copyToClipboard) {
              const result = ipc.copyToClipboard(textToCopy);
              if (result && typeof result.then === 'function') {
                // It's a promise (IPC fallback)
                result.then((res) => {
                  if (res && res.success) {
                    showMessage('Copied');
                  } else {
                    // Try navigator clipboard as fallback
                    tryNavigatorClipboard(textToCopy);
                  }
                }).catch(() => {
                  tryNavigatorClipboard(textToCopy);
                });
              } else {
                // Synchronous call succeeded
                showMessage('Copied');
              }
            } else {
              tryNavigatorClipboard(textToCopy);
            }
          } catch (error) {
            console.error('Error copying to clipboard:', error);
            showMessage('Failed to copy');
          }

          function tryNavigatorClipboard(text) {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(() => {
                showMessage('Copied');
              }).catch((err) => {
                console.error('Navigator clipboard error:', err);
                showMessage('Failed to copy');
              });
            } else {
              showMessage('Copy not available');
            }
          }
        }
        
        if (menu.parentNode) {
          document.body.removeChild(menu);
        }
      });
    });
    
    // Close menu on outside click
    setTimeout(() => {
      const closeMenu = (e) => {
        if (menu.parentNode && !menu.contains(e.target) && !item.contains(e.target)) {
          document.body.removeChild(menu);
          document.removeEventListener('click', closeMenu);
        }
      };
      document.addEventListener('click', closeMenu);
    }, 0);
  }
  
  // Delete history item from file
  async function deleteHistoryItem(timestamp) {
    try {
      await ipc.deleteHistoryItem(timestamp);
      return true;
    } catch (error) {
      console.error('Error deleting history item:', error);
      return false;
    }
  }

  function saveEdit(item, textEl) {
    if (!textEl || !item) return;
    
    const newText = textEl.textContent.trim();
    const originalText = textEl.dataset.originalText;
    
    // Remove all event listeners by replacing the element
    const parent = textEl.parentNode;
    const newTextEl = document.createElement('div');
    newTextEl.className = 'history-text';
    newTextEl.contentEditable = 'false';
    
    if (newText && newText !== originalText) {
      // Update the text
      newTextEl.textContent = newText;
      parent.replaceChild(newTextEl, textEl);
      
      item.classList.remove('editing');
      
      // Update history entry in file
      const timestamp = parseInt(item.dataset.timestamp);
      updateHistoryItem(timestamp, newText).then(() => {
        // Recalculate stats after update
        calculateStatsFromHistory();
      });
      
      editingHistoryItem = null;
      showMessage('Changes saved');
    } else if (newText === originalText) {
      // No changes, just cancel edit
      newTextEl.textContent = originalText;
      parent.replaceChild(newTextEl, textEl);
      
      item.classList.remove('editing');
      editingHistoryItem = null;
    } else {
      // Empty text, restore original
      newTextEl.textContent = originalText;
      parent.replaceChild(newTextEl, textEl);
      
      item.classList.remove('editing');
      editingHistoryItem = null;
      showMessage('Edit cancelled');
    }
    
    // Remove selection to prevent text staying selected
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        selection.removeAllRanges();
      }
    }
  }
  
  // Update history item in file
  async function updateHistoryItem(timestamp, newText) {
    try {
      const history = await ipc.getHistory();
      const updated = history.map(item => {
        if (item.ts === timestamp) {
          return { ...item, text: newText };
        }
        return item;
      });
      // Save updated history
      await ipc.saveHistory(updated);
    } catch (error) {
      console.error('Error updating history item:', error);
    }
  }

  function cancelEdit(item) {
    const textEl = item.querySelector('.history-text');
    if (!textEl) return;
    
    const originalText = textEl.dataset.originalText || textEl.textContent;
    
    // Remove all event listeners by replacing the element
    const parent = textEl.parentNode;
    const newTextEl = document.createElement('div');
    newTextEl.className = 'history-text';
    newTextEl.textContent = originalText;
    newTextEl.contentEditable = 'false';
    parent.replaceChild(newTextEl, textEl);
    
    item.classList.remove('editing');
    editingHistoryItem = null;
  }

  // Load history function
  function loadHistory() {
    const historyListFull = document.getElementById('history-list-full');
    if (!historyListFull) return;
    
    // Clear existing items
    historyListFull.innerHTML = '';
    
    ipc.getHistory().then((items) => {
      if (!items || items.length === 0) {
        return;
      }
      
      // Group items by date
      const groupedByDate = {};
      items.reverse().forEach(entry => {
        const date = new Date(entry.ts);
        const dateKey = date.toDateString();
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        const timeStr = formatTime(date);
        groupedByDate[dateKey].push({ text: entry.text, time: timeStr, timestamp: entry.ts });
      });
      
      // Display items grouped by date
      Object.keys(groupedByDate).forEach(dateKey => {
        const dateHeader = document.createElement('h3');
        dateHeader.className = 'history-title';
        const date = new Date(dateKey);
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (dateKey === today) {
          dateHeader.textContent = 'Today';
        } else if (dateKey === yesterday) {
          dateHeader.textContent = 'Yesterday';
        } else {
          dateHeader.textContent = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
        
        historyListFull.appendChild(dateHeader);
        
        groupedByDate[dateKey].forEach(entry => {
          const item = createHistoryItem(entry);
          historyListFull.appendChild(item);
        });
      });
      
      // Calculate stats from history
      calculateStatsFromHistory();
    }).catch(e => {
      console.error('Error loading history:', e);
    });
  }

  // Calculate stats from history
  function calculateStatsFromHistory() {
    // Reset stats
    stats.words = 0;
    stats.totalTime = 0;
    stats.timeSaved = 0;
    stats.wpm = 0;
    
  ipc.getHistory().then((items) => {
      if (!items || items.length === 0) {
        updateStatsDisplay();
        return;
      }
      
      // Calculate total words and track actual durations if available
      let totalActualDuration = 0;
      items.forEach(entry => {
      const wordCount = entry.text.split(/\s+/).filter(w => w.length > 0).length;
      stats.words += wordCount;
        
        // If entry has duration metadata, use it
        if (entry.duration) {
          totalActualDuration += entry.duration;
        }
      });
      
      // Use actual durations if available, otherwise estimate
      if (totalActualDuration > 0) {
        stats.totalTime = totalActualDuration;
      } else if (recordingDurations.length > 0) {
        // Use recorded durations
        stats.totalTime = recordingDurations.reduce((sum, d) => sum + d, 0);
      } else {
        // Estimate total time (average 150 WPM dictation speed)
        const avgDictationWPM = 150;
        const totalMinutes = stats.words / avgDictationWPM;
        stats.totalTime = totalMinutes * 60; // Convert to seconds
      }
      
      // Calculate average WPM
      if (stats.totalTime > 0) {
        stats.wpm = Math.round((stats.words / stats.totalTime) * 60);
      } else if (recordingDurations.length > 0) {
        // Use recorded durations for WPM calculation
        const totalDuration = recordingDurations.reduce((sum, d) => sum + d, 0);
        const avgDuration = totalDuration / recordingDurations.length;
        if (avgDuration > 0) {
          const avgWordsPerRecording = stats.words / items.length;
          stats.wpm = Math.round((avgWordsPerRecording / avgDuration) * 60);
        }
      }
      
      // Estimate time saved (assuming average typing speed of 40 WPM)
      const avgTypingWPM = 40;
      const typingMinutes = stats.words / avgTypingWPM;
      const dictationMinutes = stats.totalTime / 60;
      stats.timeSaved = Math.max(0, (typingMinutes - dictationMinutes) * 60);
      
      updateStatsDisplay();
    }).catch(e => {
      console.error('Error calculating stats from history:', e);
    updateStatsDisplay();
  });
  }
  
  // Load history on initialization
  loadHistory();

  // Stats
  function updateStats(text) {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    stats.words += wordCount;
    
    // Calculate WPM based on last recording duration
    if (recordingDurations.length > 0) {
      const lastDuration = recordingDurations[recordingDurations.length - 1];
      const minutes = lastDuration / 60;
      if (minutes > 0) {
        stats.wpm = Math.round(wordCount / minutes);
      }
    }
    
    // Estimate time saved (assuming average typing speed of 40 WPM)
    const avgTypingWPM = 40;
    const dictationMinutes = stats.totalTime / 60;
    const typingMinutes = stats.words / avgTypingWPM;
    stats.timeSaved = Math.max(0, (typingMinutes - dictationMinutes) * 60);
    
    updateStatsDisplay();
  }

  function updateStatsDisplay() {
    if (statTime) {
      const minutes = Math.floor(stats.totalTime / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        const remainingMinutes = minutes % 60;
        statTime.textContent = remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
      } else {
        statTime.textContent = minutes > 0 ? `${minutes} min` : '0 min';
      }
    }
    if (statWords) {
      const wordCount = formatNumber(stats.words);
      statWords.textContent = `${wordCount} ${stats.words === 1 ? 'word' : 'words'}`;
    }
    if (statSaved) {
      const savedMinutes = Math.floor(stats.timeSaved / 60);
      const savedHours = Math.floor(savedMinutes / 60);
      if (savedHours > 0) {
        const remainingMinutes = savedMinutes % 60;
        statSaved.textContent = remainingMinutes > 0 ? `${savedHours}h ${remainingMinutes}m` : `${savedHours}h`;
      } else {
        statSaved.textContent = savedMinutes > 0 ? `${savedMinutes} min` : '0 min';
      }
    }
    if (statWpm) {
      statWpm.textContent = `${stats.wpm} WPM`;
    }
  }

  // Utility functions
  function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function showMessage(msg) {
    // Remove any existing toast notifications
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => {
      if (toast.parentNode) {
        toast.remove();
      }
    });
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = msg;
    
    // Add animation keyframes if not already added
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes toastSlideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes toastSlideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-in';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 2000);
    
    console.log(msg);
  }

  // Edit hotkeys button - navigate to settings and open shortcuts modal
  const editHotkeysBtn = document.getElementById('edit-hotkeys-btn');
  if (editHotkeysBtn) {
    editHotkeysBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        navigateToPage('settings');
        navigateToSettingsPage('general');
        setTimeout(() => {
          const changeShortcutsBtn = document.getElementById('change-shortcuts-btn');
          if (changeShortcutsBtn) {
            changeShortcutsBtn.click();
          }
        }, 100);
      } catch (err) {
        console.error('Error navigating to shortcuts:', err);
      }
    });
  }
  
  // Make hotkey display clickable
  const hotkeyDisplay = document.getElementById('current-hold-hotkey');
  if (hotkeyDisplay) {
    hotkeyDisplay.style.cursor = 'pointer';
    hotkeyDisplay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        navigateToPage('settings');
        navigateToSettingsPage('general');
        setTimeout(() => {
          const changeShortcutsBtn = document.getElementById('change-shortcuts-btn');
          if (changeShortcutsBtn) {
            changeShortcutsBtn.click();
          }
        }, 100);
      } catch (err) {
        console.error('Error navigating to shortcuts:', err);
      }
    });
  }
  
  // Function to format hotkey for display
  function formatHotkeyForDisplay(hotkey) {
    if (!hotkey) return 'Ctrl+Win';
    return hotkey
      .replace(/CommandOrControl/gi, 'Ctrl')
      .replace(/Super/gi, 'Win')
      .replace(/\+/g, '+');
  }
  
  // Update dictation box with current hotkey
  function updateDictationBoxHotkey() {
    ipc.getSettings().then((s) => {
      const holdHotkey = s.holdHotkey || 'CommandOrControl+Super+Space';
      const displayHotkey = formatHotkeyForDisplay(holdHotkey);
      const hotkeyElement = document.getElementById('current-hold-hotkey');
      if (hotkeyElement) {
        hotkeyElement.textContent = displayHotkey;
      }
    });
  }
  
  // Initialize hotkey display on load
  updateDictationBoxHotkey();

  // Window controls
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');
  const appContainer = document.querySelector('.app-container');
  
  // Double-click on top part of app to maximize (Windows-style)
  if (appContainer) {
    appContainer.addEventListener('dblclick', (e) => {
      // Get the click position relative to the window
      const clickY = e.clientY;
      const windowHeight = window.innerHeight;
      
      // Only maximize if double-clicking in the top 60px of the window
      // and not on interactive elements
      if (clickY <= 60) {
        // Exclude clicks on buttons, window controls, and interactive elements
        const isInteractive = e.target.closest('.window-controls') || 
                              e.target.closest('button') || 
                              e.target.closest('.nav-item') ||
                              e.target.closest('.theme-toggle-btn') ||
                              e.target.closest('input') ||
                              e.target.closest('select') ||
                              e.target.closest('a');
        
        if (!isInteractive) {
          if (ipc.maximizeWindow) {
            ipc.maximizeWindow();
          }
        }
      }
    });
  }

  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ipc.minimizeWindow();
    });
  }

  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ipc.maximizeWindow();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ipc.closeWindow();
    });
  }

  // Handle tray menu actions
  if (ipc.onShowMessage) {
    ipc.onShowMessage((msg) => {
      showMessage(msg);
    });
  }

  if (ipc.onFocusHoldHotkey) {
    ipc.onFocusHoldHotkey(() => {
      navigateToPage('settings');
      navigateToSettingsPage('general');
      setTimeout(() => {
        document.getElementById('change-shortcuts-btn')?.click();
      }, 100);
    });
  }

  if (ipc.onFocusToggleHotkey) {
    ipc.onFocusToggleHotkey(() => {
      navigateToPage('settings');
      navigateToSettingsPage('general');
      setTimeout(() => {
        document.getElementById('change-shortcuts-btn')?.click();
      }, 100);
    });
  }

  // Theme toggle functionality
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  let currentTheme = 'light'; // Default to light theme
  
  // Load saved theme preference
  function loadTheme() {
    const savedTheme = localStorage.getItem('sonu-theme') || 'light';
    currentTheme = savedTheme;
    applyTheme(savedTheme);
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('data-theme', savedTheme);
    }
  }
  
  // Apply theme - simplified to use CSS variables
  function applyTheme(theme, instant = false) {
    const body = document.body;
    
    if (instant) {
      // Disable all transitions for instant theme switch
      body.classList.add('theme-switching');
      
      // Force reflow
      void body.offsetHeight;
      
      // Apply theme
      body.setAttribute('data-theme', theme);
      
      // Re-enable transitions immediately
      requestAnimationFrame(() => {
        body.classList.remove('theme-switching');
      });
    } else {
      // Normal theme application with transition
      body.setAttribute('data-theme', theme);
    }
      
    // Update theme toggle button
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      // For light/dark toggle, set based on theme
      // Custom themes (midnight-purple, solarized, soft-gray) don't affect toggle state
      if (theme === 'dark' || theme === 'midnight-purple') {
        themeToggleBtn.setAttribute('data-theme', 'dark');
      } else if (theme === 'light' || theme === 'solarized' || theme === 'soft-gray') {
        themeToggleBtn.setAttribute('data-theme', 'light');
      }
    }
    
    console.log('Theme applied:', theme);
  }
  
  if (themeToggleBtn) {
    try {
      themeToggleBtn.addEventListener('click', () => {
        try {
          // Toggle between light and dark only - this overrides custom themes
          // Determine current base theme (light or dark)
          const isCurrentlyDark = currentTheme === 'dark' || currentTheme === 'midnight-purple';
          const newTheme = isCurrentlyDark ? 'light' : 'dark';
          
          currentTheme = newTheme;
          localStorage.setItem('sonu-theme', newTheme);
          themeToggleBtn.setAttribute('data-theme', newTheme);
          
          // Apply theme instantly for smooth, non-jittery toggle
          applyTheme(newTheme, true);
          saveAppSettings({ theme: newTheme });
          
          // Update theme gallery active state
          requestAnimationFrame(() => {
            document.querySelectorAll('.theme-option').forEach(opt => {
              if (opt && opt.dataset) {
                opt.classList.toggle('active', opt.dataset.theme === newTheme);
              }
            });
          });
        } catch (e) {
          console.error('Error in theme toggle click handler:', e);
        }
      });
      console.log('Theme toggle button initialized');
    } catch (e) {
      console.error('Error setting up theme toggle:', e);
    }
  } else {
    console.warn('Theme toggle button not found');
  }
  
  // Initialize
  try {
    loadTheme();
    updateStatsDisplay();
    updateDictationBoxHotkey();
    console.log('Initialization complete');
  } catch (e) {
    console.error('Error during initialization:', e);
  }
  
  // Update dictation box when settings change
  ipc.onHotkeyRegistered(() => {
    updateDictationBoxHotkey();
  });

  // ============================================
  // Model Definitions
  // ============================================
  
  const MODEL_DEFINITIONS = {
    tiny: { description: 'Fastest, lowest accuracy - best for real-time dictation' },
    base: { description: 'Balanced speed & accuracy - recommended for most users' },
    small: { description: 'Good accuracy, slower processing' },
    medium: { description: 'High accuracy, requires more resources' },
    large: { description: 'Best accuracy, requires powerful hardware' }
  };

  // ============================================
  // Settings Functionality
  // ============================================

  // Load and save app settings
  let appSettings = {};

  async function loadAppSettings() {
    try {
      appSettings = await ipc.getAppSettings() || {};
      
      // Set defaults if not present (for first install)
      if (appSettings.sound_feedback === undefined) {
        appSettings.sound_feedback = true;
      }
      if (appSettings.waveform_animation === undefined) {
        appSettings.waveform_animation = true;
      }
      
      // Save defaults if they were added
      if (appSettings.sound_feedback === true && appSettings.waveform_animation === true) {
        const currentSettings = await ipc.getAppSettings() || {};
        if (currentSettings.sound_feedback === undefined || currentSettings.waveform_animation === undefined) {
          await saveAppSettings({ sound_feedback: true, waveform_animation: true });
        }
      }
      
      applyAppSettings();
    } catch (e) {
      console.error('Error loading app settings:', e);
      // Set defaults on error
      appSettings = { sound_feedback: true, waveform_animation: true };
      applyAppSettings();
    }
  }

  async function saveAppSettings(updates) {
    try {
      appSettings = { ...appSettings, ...updates };
      await ipc.saveAppSettings(appSettings);
      applyAppSettings();
    } catch (e) {
      console.error('Error saving app settings:', e);
    }
  }

  function applyAppSettings() {
    // Apply theme
    if (appSettings.theme) {
      applyTheme(appSettings.theme);
      currentTheme = appSettings.theme;
      if (themeToggleBtn) {
        themeToggleBtn.setAttribute('data-theme', appSettings.theme);
      }
    }

    // Apply toggles - use defaults if not set
    const toggles = {
      'auto-model-toggle': appSettings.auto_model !== undefined ? appSettings.auto_model : false,
      'vibe-coding-toggle': appSettings.vibe_coding_enabled !== undefined ? appSettings.vibe_coding_enabled : false,
      'waveform-toggle': appSettings.waveform_animation !== undefined ? appSettings.waveform_animation : true,
      'continuous-dictation-toggle': appSettings.continuous_dictation !== undefined ? appSettings.continuous_dictation : false,
      'low-latency-toggle': appSettings.low_latency !== undefined ? appSettings.low_latency : false,
      'noise-reduction-toggle': appSettings.noise_reduction !== undefined ? appSettings.noise_reduction : false,
      'local-only-toggle': appSettings.local_only !== undefined ? appSettings.local_only : true,
      'auto-delete-cache-toggle': appSettings.auto_delete_cache !== undefined ? appSettings.auto_delete_cache : false,
      'launch-on-startup-toggle': appSettings.launch_on_startup !== undefined ? appSettings.launch_on_startup : false,
      'sound-feedback-toggle': appSettings.sound_feedback !== undefined ? appSettings.sound_feedback : true
    };

    Object.entries(toggles).forEach(([id, value]) => {
      const toggle = document.getElementById(id);
      if (toggle) {
        // For boolean values, use the value directly (don't use || false which would make true become false)
        toggle.checked = value === true;
      }
    });

    // Apply selects
    if (appSettings.selected_model) {
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) modelSelect.value = appSettings.selected_model;
    }

    if (appSettings.language) {
      const langSelect = document.getElementById('default-language-select');
      if (langSelect) langSelect.value = appSettings.language;
    }

    // Apply theme selection
    if (appSettings.theme) {
      document.querySelectorAll('.theme-option').forEach(option => {
        option.classList.toggle('active', option.dataset.theme === appSettings.theme);
      });
    }
  }

  // System Info Tab
  async function loadSystemInfo() {
    const container = document.getElementById('system-info-container');
    if (!container) {
      console.warn('System info container not found');
      return;
    }

    container.innerHTML = '<div class="system-info-loading">Loading system information...</div>';

    // Retry mechanism in case handler isn't ready yet
    let retries = 3;
    let info = null;
    
    while (retries > 0 && !info) {
      try {
        if (ipc.getSystemInfo && typeof ipc.getSystemInfo === 'function') {
          info = await ipc.getSystemInfo();
          if (info && Object.keys(info).length > 0) {
            break;
          }
        }
      } catch (e) {
        console.warn(`Attempt ${4 - retries} failed:`, e.message);
        if (retries > 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
        }
      }
      retries--;
    }

    if (!info || Object.keys(info).length === 0) {
      container.innerHTML = `<div class="system-info-loading" style="color: var(--text-muted);">Error loading system information. Please try refreshing the page or restarting the app.</div>`;
      return;
    }
    
    container.innerHTML = '';

    const fields = ['Device', 'OS', 'CPU', 'Cores', 'Threads', 'RAM', 'GPU', 'Arch', 'App Version'];
    fields.forEach((field, index) => {
      const row = document.createElement('div');
      row.className = 'system-info-row';
      row.style.animationDelay = `${index * 0.05}s`;
      row.innerHTML = `
        <span class="system-info-label">${field}:</span>
        <span class="system-info-value">${info[field] || 'N/A'}</span>
      `;
      container.appendChild(row);
    });
  }

  // Load system info when System tab is opened (also handled in navigateToSettingsPage)
  // But keep this as backup
  const systemTabBtn = document.querySelector('[data-settings-page="system"]');
  if (systemTabBtn) {
    systemTabBtn.addEventListener('click', () => {
      setTimeout(loadSystemInfo, 100);
    });
  }
  
  // Load system info on first load if System tab is active
  // Check if we're on settings page and system tab is active
  setTimeout(() => {
    const systemPage = document.getElementById('settings-system');
    if (systemPage && systemPage.classList.contains('active')) {
      loadSystemInfo();
    }
  }, 500);

  // Refresh system info button
  const refreshSystemInfoBtn = document.getElementById('refresh-system-info-btn');
  if (refreshSystemInfoBtn) {
    refreshSystemInfoBtn.addEventListener('click', loadSystemInfo);
  }

  // Model Selector Tab - optimized with caching and parallel loading
  let modelSelectorLoaded = false;
  let systemProfileCache = null;
  
  async function loadModelSelector() {
    // Prevent multiple simultaneous loads
    if (modelSelectorLoaded) return;
    modelSelectorLoaded = true;
    
    try {
      // Load all data in parallel for faster loading
      const [systemProfile, spaceInfo, pathResult, suggestedModel] = await Promise.allSettled([
        systemProfileCache || (ipc.getSystemProfile && typeof ipc.getSystemProfile === 'function' ? ipc.getSystemProfile() : Promise.resolve(null)),
        ipc.getModelSpace && typeof ipc.getModelSpace === 'function' ? ipc.getModelSpace() : Promise.resolve(null),
        ipc.getModelDownloadPath && typeof ipc.getModelDownloadPath === 'function' ? ipc.getModelDownloadPath() : Promise.resolve(null),
        ipc.getSuggestedModel && typeof ipc.getSuggestedModel === 'function' ? ipc.getSuggestedModel() : Promise.resolve(null)
      ]);
      
      // Cache system profile for future use
      if (systemProfile.status === 'fulfilled' && systemProfile.value) {
        systemProfileCache = systemProfile.value;
      }
      
      // Display recommendation (non-blocking)
      if (systemProfile.status === 'fulfilled' && systemProfile.value) {
        const profile = systemProfile.value;
        console.log('System profile:', profile);
          
          // Display recommendation
          const recommendationCard = document.getElementById('model-recommendation-card');
          const recommendationText = document.getElementById('model-recommendation-text');
          const hardwareInfo = document.getElementById('model-hardware-info');
          
        if (recommendationCard && recommendationText && profile && profile.recommended) {
          const rec = profile.recommended;
            recommendationText.innerHTML = `<strong>${rec.family}</strong> — <b>${rec.model}</b><br><span style="font-size: 0.9em; color: #6b21a8;">${rec.note || ''}</span>`;
            
            if (hardwareInfo) {
            const gpuText = profile.gpu ? 'Yes' : 'No';
            hardwareInfo.textContent = `CPU: ${profile.cpu_cores} cores | RAM: ${profile.ram_gb} GB | GPU: ${gpuText}`;
            }
            
            recommendationCard.style.display = 'block';
            
            // Update the inline recommendation text
            const recommendedModelName = document.getElementById('recommended-model-name');
            if (recommendedModelName) {
              recommendedModelName.textContent = rec.model.toUpperCase();
            }
            
            // Auto-select recommended model if auto-pick is enabled
            const autoModelToggle = document.getElementById('auto-model-toggle');
            const modelSelect = document.getElementById('model-select');
            if (autoModelToggle && autoModelToggle.checked && modelSelect) {
              modelSelect.value = rec.model;
              saveAppSettings({ selected_model: rec.model });
            } else if (modelSelect && !modelSelect.value) {
              // Set as default if no model is selected
              modelSelect.value = rec.model;
          }
        }
      }
      
      // Fallback to simple suggestion
      if (suggestedModel.status === 'fulfilled' && suggestedModel.value) {
        const modelSelect = document.getElementById('model-select');
        if (modelSelect && suggestedModel.value && !modelSelect.value) {
          modelSelect.value = suggestedModel.value;
        }
        
        // Update recommendation text if not already set by system profile
        if (!systemProfileCache || !systemProfileCache.recommended) {
          const recommendedModelName = document.getElementById('recommended-model-name');
          if (recommendedModelName && suggestedModel.value) {
            recommendedModelName.textContent = suggestedModel.value.toUpperCase();
          }
        }
      }
      
      // Display disk space
      if (spaceInfo.status === 'fulfilled' && spaceInfo.value) {
        const space = spaceInfo.value;
        const diskSpaceEl = document.getElementById('model-disk-space');
        if (diskSpaceEl) {
          if (space && typeof space === 'object') {
            // New format: {success, space_gb, path}
            if (space.success && space.space_gb > 0) {
              diskSpaceEl.innerHTML = `Available Space: <strong>${space.space_gb.toFixed(2)} GB</strong><br>Models stored at: <strong>${space.path || 'Not found'}</strong>`;
            } else {
              diskSpaceEl.textContent = `Available Space: Unable to check${space.path ? `\nModels stored at: ${space.path}` : ''}`;
            }
          } else if (typeof space === 'number' && space > 0) {
            // Old format: just a number
            diskSpaceEl.textContent = `Available Space: ${space.toFixed(2)} GB`;
          } else {
            diskSpaceEl.textContent = 'Available Space: Unable to check';
          }
        }
      }
      
      // Display download path
      if (pathResult.status === 'fulfilled' && pathResult.value) {
        const path = pathResult.value;
        const pathInput = document.getElementById('model-download-path');
        if (pathInput && path && path.success) {
          pathInput.value = path.path || '';
        }
      }
      
      // Check model status (non-blocking)
      checkModelStatus().catch(e => console.error('Error checking model status:', e));
    } catch (e) {
      console.error('Error loading model selector:', e);
    } finally {
      modelSelectorLoaded = false;
    }
  }
  
  // Browse model download path button
  const browseModelPathBtn = document.getElementById('browse-model-path-btn');
  if (browseModelPathBtn) {
    browseModelPathBtn.addEventListener('click', async () => {
      try {
        if (ipc.browseModelDownloadPath && typeof ipc.browseModelDownloadPath === 'function') {
          const result = await ipc.browseModelDownloadPath();
          if (result && result.success && result.path) {
            const pathInput = document.getElementById('model-download-path');
            if (pathInput) {
              pathInput.value = result.path;
            }
            
            // Save the path
            if (ipc.setModelDownloadPath && typeof ipc.setModelDownloadPath === 'function') {
              await ipc.setModelDownloadPath(result.path);
            }
          }
        }
      } catch (e) {
        console.error('Error browsing model path:', e);
      }
    });
  }

  // Load model selector when tab is opened (only once, no duplicate calls)
  const modelTabBtn = document.querySelector('[data-settings-page="model"]');
  if (modelTabBtn) {
    let modelTabLoaded = false;
    modelTabBtn.addEventListener('click', () => {
      if (!modelTabLoaded) {
        modelTabLoaded = true;
        // Load once when tab is first opened
        setTimeout(() => {
          loadModelSelector();
          modelTabLoaded = false;
        }, 100);
      }
    });
  }

  // Auto-model toggle
  const autoModelToggle = document.getElementById('auto-model-toggle');
  if (autoModelToggle) {
    autoModelToggle.addEventListener('change', (e) => {
      saveAppSettings({ auto_model: e.target.checked });
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) {
        modelSelect.disabled = e.target.checked;
        if (e.target.checked) {
          loadModelSelector();
        }
      }
    });
  }

  // Model select change - check status and update button
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    modelSelect.addEventListener('change', async (e) => {
      const modelName = e.target.value;
      saveAppSettings({ selected_model: modelName });
      
      // Check if model is downloaded and update button state
      await checkModelStatus();
    });
  }

  // Import model button
  const importModelBtn = document.getElementById('import-model-btn');
  if (importModelBtn) {
    importModelBtn.addEventListener('click', async () => {
      console.log('Import model button clicked');
      
      const progressContainer = document.getElementById('model-progress');
      const progressFill = document.getElementById('model-progress-fill');
      const progressText = document.getElementById('model-progress-text');
      const progressSpeed = document.getElementById('model-progress-speed');
      const downloadModelBtn = document.getElementById('download-model-btn');

      // Don't show progress yet - wait until file is selected
      importModelBtn.disabled = true;
      if (downloadModelBtn) downloadModelBtn.disabled = true;

      try {
        if (!ipc.importModel || typeof ipc.importModel !== 'function') {
          throw new Error('importModel function not available');
        }

        const result = await ipc.importModel();
        
        // Only show progress if a file was actually selected
        if (result && result.success) {
          if (progressContainer) progressContainer.style.display = 'block';
          if (progressFill) progressFill.style.width = '0%';
          if (progressSpeed) progressSpeed.style.display = 'none';
          
          // Hide patience message for imports (only show for downloads)
          const patienceMessage = document.getElementById('download-patience-message');
          if (patienceMessage) patienceMessage.style.display = 'none';
        }
        console.log('Import result:', result);

        if (result && result.success) {
          if (progressFill) progressFill.style.width = '100%';
          
          const modelDisplay = result.model_display || (result.model ? result.model.toUpperCase() : 'Model');
          const sizeInfo = result.size_mb ? ` (${result.size_mb.toFixed(0)} MB)` : '';
          const pathInfo = result.path ? `\nLocation: ${result.path}` : '';
          
          if (progressText) {
            if (result.cached) {
              progressText.textContent = `✅ ${modelDisplay} already imported${sizeInfo}`;
            } else {
              progressText.textContent = `✅ ${modelDisplay} imported successfully${sizeInfo}`;
            }
          }
          
          // Status message removed - keeping UI clean
          
          // Immediately update active model display with imported model
          const activeModelDesc = document.getElementById('active-model-desc');
          const activeModelStatus = document.getElementById('active-model-status');
          
          if (activeModelDesc) {
            const modelInfo = MODEL_DEFINITIONS[result.model] || {};
            activeModelDesc.textContent = `${modelDisplay} - ${modelInfo.description || 'Imported model'}`;
          }
          
          if (activeModelStatus) {
            activeModelStatus.innerHTML = '<span style="color: #10b981; font-weight: 600;">✓ Ready</span>';
          }
          
          // Also update in background
          setTimeout(() => {
            checkModelStatus().catch(e => console.warn('Error checking model status:', e));
            updateActiveModelDisplay().catch(e => console.warn('Error updating active model display:', e));
          }, 100);
          
          // Show success notification
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('show-toast', { 
              detail: { 
                message: `${modelDisplay} activated!`, 
                type: 'success' 
              } 
            }));
          }, 500);
          
              setTimeout(() => {
                if (progressContainer) {
                  progressContainer.style.display = 'none';
                  progressContainer.classList.remove('active');
                }
              }, 3000);
        } else {
          if (progressFill) progressFill.style.width = '0%';
          const errorMsg = (result && result.message) || (result && result.error) || 'Failed to import model';
          if (progressText) progressText.textContent = `❌ Import failed: ${errorMsg}`;
          
          setTimeout(() => {
            if (progressContainer) {
              progressContainer.style.display = 'none';
              progressContainer.classList.remove('active');
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Error importing model:', error);
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = `❌ Error: ${error.message}`;
        
        setTimeout(() => {
          if (progressContainer) progressContainer.style.display = 'none';
        }, 5000);
      } finally {
        importModelBtn.disabled = false;
        if (downloadModelBtn) downloadModelBtn.disabled = false;
      }
    });
  }

  // Download model button with real-time progress
  const downloadModelBtn = document.getElementById('download-model-btn');
  if (downloadModelBtn) {
    downloadModelBtn.addEventListener('click', async () => {
      console.log('Download button clicked');
      
      const modelSelect = document.getElementById('model-select');
      const modelName = modelSelect ? modelSelect.value : 'base';
      const progressContainer = document.getElementById('model-progress');
      const progressFill = document.getElementById('model-progress-fill');
      const progressText = document.getElementById('model-progress-text');
      const progressSpeed = document.getElementById('model-progress-speed');

      // Show progress container with class toggle instead of inline style
      if (progressContainer) {
        progressContainer.classList.add('active');
        progressContainer.style.display = 'block';
        console.log('✓ Progress container shown');
      }
      if (progressFill) progressFill.style.width = '0%';
      if (progressText) progressText.textContent = `Checking model cache...`;
      if (progressSpeed) progressSpeed.style.display = 'none';
      // Don't update statusDesc here - keep it clean
      
      downloadModelBtn.disabled = true;

      try {
        // First check if model already exists
        console.log('Checking if model exists:', modelName);
        if (!ipc.checkModel || typeof ipc.checkModel !== 'function') {
          throw new Error('checkModel function not available');
        }
        
        const checkResult = await ipc.checkModel(modelName);
        console.log('Model check result for', modelName, ':', checkResult);
        
        if (checkResult && checkResult.exists) {
          // Model exists - proceed to download handler which will set it as active
          console.log('Model', modelName, 'exists, activating it...');
          if (progressText) progressText.textContent = `Activating ${modelName.toUpperCase()} model...`;
        } else {
          // Model doesn't exist, start download
          console.log('Model', modelName, 'not found, starting download...');
          if (progressText) progressText.textContent = `Initializing download for ${modelName.toUpperCase()}...`;
        }
        
        if (progressSpeed) progressSpeed.style.display = 'block';
        
        // CRITICAL: Show patience message - already visible by default in HTML now
        const patienceMessage = document.getElementById('download-patience-message');
        if (patienceMessage) {
          // Message is visible by default - just log
          console.log('✓ Patience message visible (default)');
        } else {
          console.error('✗ Patience message element not found!');
        }
        
        // CRITICAL: Cancel button is visible by default in CSS - just log
        const cancelBtn = document.getElementById('cancel-download-btn');
        if (cancelBtn) {
          console.log('✓ Cancel button visible (CSS default)');
          console.log('Cancel button display:', window.getComputedStyle(cancelBtn).display);
        } else {
          console.error('✗ CRITICAL: Cancel button not found in DOM!');
        }

        // Track this download
        let downloadCancelled = false;
        activeDownloads.set(modelName, { cancelled: false });

        // Set up progress listeners BEFORE starting download
        let progressListener = null;
        let completeListener = null;
        let errorListener = null;
        let lastProgressPercent = 0;
        let lastProgressTime = Date.now();
        let stuckProgressTimeout = null;

        if (ipc.onModelProgress && typeof ipc.onModelProgress === 'function') {
          progressListener = (data) => {
            console.log('Progress update:', data);
            if (data.percent !== undefined) {
              const currentPercent = data.percent;
              const currentTime = Date.now();
              
              // Update progress bar
              if (progressFill) progressFill.style.width = `${currentPercent}%`;
              
              // Once download actually starts (>5%), hide patience message
              if (currentPercent > 5) {
                const patienceMsg = document.getElementById('download-patience-message');
                if (patienceMsg && patienceMsg.style.display !== 'none') {
                  patienceMsg.style.display = 'none';
                  console.log('✓ Patience message hidden (download progressing at ' + currentPercent + '%)');
                }
              }
              
              // Handle speed display
              if (progressSpeed && data.speedKB !== undefined && data.speedKB > 0) {
                const speedText = data.speedKB >= 1024 
                  ? `${(data.speedKB / 1024).toFixed(2)} MB/s` 
                  : `${data.speedKB.toFixed(1)} KB/s`;
                progressSpeed.textContent = speedText;
                progressSpeed.style.display = 'block';
              } else if (progressSpeed) {
                progressSpeed.style.display = 'none';
              }
              
              // Show detailed download progress (bytes downloaded vs expected)
              const progressDetails = document.getElementById('model-progress-details');
              if (progressDetails && data.downloadedMB !== undefined && data.totalMB !== undefined) {
                progressDetails.textContent = `Downloaded: ${data.downloadedMB.toFixed(1)} MB / ${data.totalMB.toFixed(1)} MB`;
                progressDetails.style.display = 'block';
              } else if (progressDetails && data.message) {
                // Show message if detailed size not available
                progressDetails.textContent = data.message;
                progressDetails.style.display = 'block';
              }
              
              // Handle progress text with better messages
              if (progressText) {
                let message = data.message || `Downloading ${modelName}...`;
                
                // Handle edge cases
                if (currentPercent > 0 && currentPercent < 20 && message.includes('0 MB')) {
                  message = `Connecting to download source... (${currentPercent}%)`;
                } else if (currentPercent >= 20 && currentPercent < 50 && message.includes('0 MB')) {
                  message = `Initializing download... (${currentPercent}%)`;
                } else if (currentPercent >= 50 && currentPercent < 70 && message.includes('0 MB')) {
                  message = `Download starting... (${currentPercent}%)`;
                } else if (currentPercent >= 98) {
                  message = `Finalizing download... (${currentPercent}%)`;
                }
                
                progressText.textContent = message;
              }
              
              // Don't update statusDesc during download - keep it clean
              // All info is shown in progressText, progressSpeed, and progressDetails
              
              // Track progress for stuck detection
              if (currentPercent === lastProgressPercent) {
                // Progress hasn't changed, check if stuck
                const timeSinceLastProgress = currentTime - lastProgressTime;
                if (timeSinceLastProgress > 60000) { // 1 minute with no progress
                  // Clear any existing timeout
                  if (stuckProgressTimeout) {
                    clearTimeout(stuckProgressTimeout);
                  }
                  
                  // Set timeout to show stuck message
                  stuckProgressTimeout = setTimeout(() => {
                    if (progressText) {
                      progressText.textContent = `Download appears stuck at ${currentPercent}%. Trying different mirror...`;
                    }
                    // Download stuck - mirrors will auto-rotate
                  }, 30000); // Show message after 30 more seconds
                }
              } else {
                // Progress changed, reset stuck detection
                lastProgressPercent = currentPercent;
                lastProgressTime = currentTime;
                if (stuckProgressTimeout) {
                  clearTimeout(stuckProgressTimeout);
                  stuckProgressTimeout = null;
                }
              }
            }
          };
          ipc.onModelProgress(progressListener);
        } else {
          console.warn('onModelProgress not available');
        }

        if (ipc.onModelComplete && typeof ipc.onModelComplete === 'function') {
          completeListener = (data) => {
            console.log('Download complete:', data);
            
            // Clear stuck progress timeout
            if (stuckProgressTimeout) {
              clearTimeout(stuckProgressTimeout);
              stuckProgressTimeout = null;
            }
            
            // Don't manually hide cancel button - it will hide when progressContainer hides
            // The CSS rule .model-progress[style*="display: none"] .cancel-download-button handles it
            const patienceMsg = document.getElementById('download-patience-message');
            if (patienceMsg) patienceMsg.style.display = 'none';
            activeDownloads.delete(modelName);
            
            if (data.success) {
              if (progressFill) progressFill.style.width = '100%';
              if (progressSpeed) progressSpeed.style.display = 'none';
              
              const sizeInfo = data.size_mb ? ` (${data.size_mb} MB)` : '';
              const pathInfo = data.path ? `\nLocation: ${data.path}` : '';
              
              if (data.cached) {
                // Model was already downloaded
                if (progressText) progressText.textContent = `✅ ${modelName.toUpperCase()} already downloaded${sizeInfo}`;
              } else {
                // Model was just downloaded
                if (progressText) progressText.textContent = `✅ ${modelName.toUpperCase()} downloaded successfully${sizeInfo}`;
              }
              
              if (data.path) {
                console.log(`Model stored at: ${data.path}`);
              }
              
              saveAppSettings({ selected_model: modelName });
              
              // Refresh model status and active model display immediately
              setTimeout(() => {
                checkModelStatus().catch(e => console.warn('Error checking model status:', e));
                updateActiveModelDisplay().catch(e => console.warn('Error updating active model display:', e));
              }, 500);
              
              // Show success notification
              if (window.voiceApp && window.voiceApp.onShowMessage) {
                setTimeout(() => {
                  const message = data.cached 
                    ? `${modelName.toUpperCase()} model activated!` 
                    : `${modelName.toUpperCase()} model downloaded and activated!`;
                  window.dispatchEvent(new CustomEvent('show-toast', { 
                    detail: { message, type: 'success' } 
                  }));
                }, 1000);
              }
            } else {
              if (progressFill) progressFill.style.width = '0%';
              if (progressSpeed) progressSpeed.style.display = 'none';
              if (progressText) progressText.textContent = `❌ Error: ${data.error || data.message || 'Unknown error'}`;
            }
            
            setTimeout(() => {
              if (progressContainer) progressContainer.style.display = 'none';
            }, 5000);
            
            downloadModelBtn.disabled = false;
          };
          ipc.onModelComplete(completeListener);
        } else {
          console.warn('onModelComplete not available');
        }

        if (ipc.onModelError && typeof ipc.onModelError === 'function') {
          errorListener = async (data) => {
            console.error('Download error:', data);
            
            // Clear stuck progress timeout
            if (stuckProgressTimeout) {
              clearTimeout(stuckProgressTimeout);
              stuckProgressTimeout = null;
            }
            
            // Don't manually hide cancel button - it will hide when progressContainer hides
            // The CSS rule .model-progress[style*="display: none"] .cancel-download-button handles it
            const patienceMsg = document.getElementById('download-patience-message');
            if (patienceMsg) patienceMsg.style.display = 'none';
            activeDownloads.delete(modelName);
            
            if (progressFill) progressFill.style.width = '0%';
            if (progressSpeed) progressSpeed.style.display = 'none';
            
            const errorMessage = data.error || data.message || 'Unknown error';
            let userFriendlyMessage = errorMessage;
            
            // Provide user-friendly error messages
            if (errorMessage.includes('timeout')) {
              userFriendlyMessage = 'Download timed out. Please check your internet connection and try again.';
            } else if (errorMessage.includes('connection') || errorMessage.includes('network')) {
              userFriendlyMessage = 'Network error. Please check your internet connection and try again.';
            } else if (errorMessage.includes('mirror') || errorMessage.includes('source')) {
              userFriendlyMessage = 'Download source unavailable. Trying alternative sources...';
            }
            
            if (progressText) progressText.textContent = `❌ Error: ${userFriendlyMessage}`;
            
            // Show manual download section on error
            await showManualDownloadLinks();
            
            setTimeout(() => {
              if (progressContainer) progressContainer.style.display = 'none';
            }, 5000);
            
            downloadModelBtn.disabled = false;
          };
          ipc.onModelError(errorListener);
        } else {
          console.warn('onModelError not available');
        }

        // Start download
        console.log('Calling downloadModel IPC...');
        if (!ipc.downloadModel || typeof ipc.downloadModel !== 'function') {
          throw new Error('downloadModel function not available');
        }
        
        const result = await ipc.downloadModel(modelName);
        console.log('Download result:', result);
        
        // If we got a result immediately (shouldn't happen with progress system, but handle it)
        if (result && !result.type) {
          if (result.success) {
            if (progressFill) progressFill.style.width = '100%';
            const cacheInfo = result.cached ? ' (already in cache)' : '';
            const sizeInfo = result.size_mb ? ` (${result.size_mb} MB)` : '';
            const pathInfo = result.path ? `\nLocation: ${result.path}` : '';
            if (progressText) progressText.textContent = `✅ ${modelName} ready${sizeInfo}`;
            
            if (result.path) {
              console.log(`Model stored at: ${result.path}`);
            }
            
            saveAppSettings({ selected_model: modelName });
          } else {
              if (progressFill) progressFill.style.width = '0%';
              if (progressText) progressText.textContent = `❌ Error: ${result.error || result.message || 'Unknown error'}`;
            }
          
          setTimeout(() => {
            if (progressContainer) {
              progressContainer.style.display = 'none';
              progressContainer.classList.remove('active');
            }
          }, 5000);
          
          downloadModelBtn.disabled = false;
        }
      } catch (e) {
        console.error('Download error:', e);
        if (progressText) progressText.textContent = `Error: ${e.message}`;
        downloadModelBtn.disabled = false;
        // Don't manually hide - CSS handles it when progressContainer hides
        const patienceMsg = document.getElementById('download-patience-message');
        if (patienceMsg) patienceMsg.style.display = 'none';
      }
    });
  }
  
  // Cancel download button handler
  const cancelDownloadBtn = document.getElementById('cancel-download-btn');
  if (cancelDownloadBtn) {
    cancelDownloadBtn.addEventListener('click', async () => {
      console.log('Cancel button clicked');
      
      // Mark all active downloads as cancelled
      for (const [modelName, downloadInfo] of activeDownloads.entries()) {
        downloadInfo.cancelled = true;
        console.log(`Cancelling download: ${modelName}`);
      }
      
      // Call IPC to cancel download
      if (ipc.cancelDownload && typeof ipc.cancelDownload === 'function') {
        try {
          await ipc.cancelDownload();
        } catch (e) {
          console.error('Error cancelling download:', e);
        }
      }
      
      // Don't hide cancel button manually - CSS handles it
      // Hide patience message
      const patienceMsg = document.getElementById('download-patience-message');
      if (patienceMsg) patienceMsg.style.display = 'none';
      
      const progressContainer = document.getElementById('model-progress');
      const progressText = document.getElementById('model-progress-text');
      const progressFill = document.getElementById('model-progress-fill');
      
      if (progressText) progressText.textContent = '❌ Download cancelled';
      if (progressFill) progressFill.style.width = '0%';
      
      setTimeout(() => {
        if (progressContainer) {
          progressContainer.style.display = 'none';
          progressContainer.classList.remove('active');
        }
      }, 2000);
      
      // Re-enable download button
      const downloadModelBtn = document.getElementById('download-model-btn');
      if (downloadModelBtn) downloadModelBtn.disabled = false;
      
      // Clear active downloads
      activeDownloads.clear();
    });
  }
  
  // Check model status on load - wrapped to prevent breaking the script
  async function checkModelStatus() {
    try {
      const modelSelect = document.getElementById('model-select');
      const statusDesc = document.getElementById('model-status-desc');
      const downloadBtn = document.getElementById('download-model-btn');
      
      if (!modelSelect || !statusDesc) {
        // Elements don't exist yet, that's okay
        return;
      }
      
      const modelName = modelSelect.value || 'base';
      
      if (ipc.checkModel && typeof ipc.checkModel === 'function') {
        try {
          const checkResult = await ipc.checkModel(modelName);
          if (checkResult && checkResult.exists) {
            const sizeInfo = checkResult.size_mb ? ` (${checkResult.size_mb} MB)` : '';
            const pathInfo = checkResult.path || checkResult.cache_path || '';
            // Model ready - status removed for clean UI
            
            // Disable download button if model exists
            if (downloadBtn) {
              downloadBtn.disabled = true;
              downloadBtn.textContent = 'Model Already Installed';
              downloadBtn.classList.add('disabled');
            }
          } else {
            // Model not downloaded - status removed for clean UI
            
            // Enable download button if model doesn't exist
            if (downloadBtn) {
              downloadBtn.disabled = false;
              downloadBtn.textContent = 'Download & Apply Model';
              downloadBtn.classList.remove('disabled');
            }
          }
        } catch (e) {
          // Silently fail - don't break the app if model check fails
          console.warn('Model status check failed (non-critical):', e);
          // Enable button on error (assume model not downloaded)
          if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download & Apply Model';
            downloadBtn.classList.remove('disabled');
          }
        }
      } else {
        // Enable button if check function not available
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.textContent = 'Download & Apply Model';
          downloadBtn.classList.remove('disabled');
        }
      }
    } catch (e) {
      // Silently fail - don't break the app
      console.warn('Error checking model status (non-critical):', e);
      // Enable button on error
      const downloadBtn = document.getElementById('download-model-btn');
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download & Apply Model';
        downloadBtn.classList.remove('disabled');
      }
    }
  }
  
  // Check model status when model selector changes - only set up if elements exist
  // Delay to ensure DOM is fully loaded and prevent breaking the script
  setTimeout(() => {
    try {
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) {
        modelSelect.addEventListener('change', () => {
          // Don't await - fire and forget
          checkModelStatus().catch(e => {
            console.warn('Model status check failed on change:', e);
          });
        });
      }
      
      // Check model status on initial load (only if we're on the settings page)
      if (currentPage === 'settings' || currentSettingsPage === 'model') {
        checkModelStatus().catch(e => {
          console.warn('Initial model status check failed:', e);
        });
      }
    } catch (e) {
      console.warn('Error setting up model status check:', e);
    }
  }, 1000); // Wait 1 second to ensure everything is loaded

  // Themes Tab - Initialize theme gallery
  function initializeThemeGallery() {
  const themeOptions = document.querySelectorAll('.theme-option');
    if (themeOptions.length === 0) {
      // Retry if elements aren't loaded yet
      setTimeout(initializeThemeGallery, 500);
        return;
      }
      
    // Set active theme on load
    const savedTheme = currentTheme || 'light';
    themeOptions.forEach(opt => {
      if (opt.dataset.theme === savedTheme) {
        opt.classList.add('active');
              } else {
        opt.classList.remove('active');
              }
            });
            
            themeOptions.forEach(option => {
      // Remove any existing listeners by cloning
      const newOption = option.cloneNode(true);
      option.parentNode.replaceChild(newOption, option);
      
      newOption.addEventListener('click', () => {
        const theme = newOption.dataset.theme;
        if (!theme) return;
      
        // Custom themes take priority and override main toggle
        currentTheme = theme;
        applyTheme(theme);
        saveAppSettings({ theme });
          
        // Update active state
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        newOption.classList.add('active');
      });
    });
    
    console.log('Theme gallery initialized with', themeOptions.length, 'themes');
        }
        
  // Initialize theme gallery when settings page is opened
  setTimeout(() => {
    initializeThemeGallery();
  }, 1000); // Wait 1 second to ensure everything is loaded

  // Follow system theme feature removed - no longer needed

  // General Tab Toggles
  const launchOnStartupToggle = document.getElementById('launch-on-startup-toggle');
  if (launchOnStartupToggle) {
    launchOnStartupToggle.addEventListener('change', (e) => {
      saveAppSettings({ launch_on_startup: e.target.checked });
    });
  }

  const defaultLanguageSelect = document.getElementById('default-language-select');
  if (defaultLanguageSelect) {
    defaultLanguageSelect.addEventListener('change', (e) => {
      saveAppSettings({ language: e.target.value });
    });
  }

  const soundFeedbackToggle = document.getElementById('sound-feedback-toggle');
  if (soundFeedbackToggle) {
    soundFeedbackToggle.addEventListener('change', (e) => {
      saveAppSettings({ sound_feedback: e.target.checked });
    });
  }

  // Vibe Coding Tab
  const vibeCodingToggle = document.getElementById('vibe-coding-toggle');
  if (vibeCodingToggle) {
    vibeCodingToggle.addEventListener('change', (e) => {
      saveAppSettings({ vibe_coding_enabled: e.target.checked });
    });
  }

  const waveformToggle = document.getElementById('waveform-toggle');
  if (waveformToggle) {
    waveformToggle.addEventListener('change', (e) => {
      saveAppSettings({ waveform_animation: e.target.checked });
      
      // If recording is active and toggle is turned on, start animation
      if (e.target.checked && isListening) {
        startWaveformAnimation();
      } else if (!e.target.checked) {
        // If toggle is turned off, stop animation
        stopWaveformAnimation();
      }
    });
  }

  // Experimental Tab
  const continuousDictationToggle = document.getElementById('continuous-dictation-toggle');
  if (continuousDictationToggle) {
    continuousDictationToggle.addEventListener('change', (e) => {
      saveAppSettings({ continuous_dictation: e.target.checked });
    });
  }

  const lowLatencyToggle = document.getElementById('low-latency-toggle');
  if (lowLatencyToggle) {
    lowLatencyToggle.addEventListener('change', (e) => {
      saveAppSettings({ low_latency: e.target.checked });
    });
  }

  const noiseReductionToggle = document.getElementById('noise-reduction-toggle');
  if (noiseReductionToggle) {
    noiseReductionToggle.addEventListener('change', (e) => {
      saveAppSettings({ noise_reduction: e.target.checked });
    });
  }

  // Privacy Tab
  const localOnlyToggle = document.getElementById('local-only-toggle');
  if (localOnlyToggle) {
    localOnlyToggle.addEventListener('change', (e) => {
      saveAppSettings({ local_only: e.target.checked });
    });
  }

  const autoDeleteCacheToggle = document.getElementById('auto-delete-cache-toggle');
  if (autoDeleteCacheToggle) {
    autoDeleteCacheToggle.addEventListener('change', (e) => {
      saveAppSettings({ auto_delete_cache: e.target.checked });
    });
  }

  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      try {
        const result = await ipc.clearCache();
        if (result.success) {
          showMessage('Cache cleared successfully');
        } else {
          showMessage('Error clearing cache: ' + (result.error || 'Unknown error'));
        }
      } catch (e) {
        showMessage('Error clearing cache: ' + e.message);
      }
    });
  }

  // Sign out button
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      showMessage('Sign out functionality coming soon');
    });
  }

  // Sound feedback handler
  let audioContext = null;
  let audioContextInitialized = false;
  
  function getAudioContext() {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextInitialized = true;
        // Resume audio context if suspended (required for user interaction)
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(e => {
            console.error('Failed to resume audio context on init:', e);
          });
        }
      } catch (e) {
        console.error('AudioContext not available:', e);
        return null;
      }
    }
    // Resume if suspended
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(e => {
        console.error('Failed to resume audio context:', e);
      });
    }
    return audioContext;
  }
  
  // Initialize audio context on user interaction (required by browsers)
  // Use multiple event types to ensure initialization
  const initAudioContext = () => {
    if (!audioContextInitialized) {
      const ctx = getAudioContext();
      if (ctx) {
        ctx.resume().then(() => {
          audioContextInitialized = true;
          console.log('Audio context initialized and resumed');
        }).catch(e => {
          console.error('Failed to resume audio context on init:', e);
        });
      }
    }
  };
  
  // Initialize on any user interaction
  ['click', 'keydown', 'mousedown', 'touchstart'].forEach(eventType => {
    document.addEventListener(eventType, initAudioContext, { once: true, passive: true });
  });

  function playBeep(freq = 880, duration = 120, type = 'sine') {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    try {
      // Ensure context is running
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.error('Failed to resume audio context:', e));
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch (e) {}
      }, duration + 20);
    } catch (e) {
      console.error('Error playing beep:', e);
    }
  }

  function playBeepStart() {
    playBeep(880, 140, 'sine');
  }

  function playBeepStop() {
    playBeep(440, 160, 'sine');
  }

  // Listen for sound feedback events
  if (ipc.onPlaySound) {
    ipc.onPlaySound((type) => {
      // Check if sound feedback is enabled by checking the toggle directly
      const soundFeedbackToggle = document.getElementById('sound-feedback-toggle');
      let isEnabled = false;
      
      if (soundFeedbackToggle) {
        isEnabled = soundFeedbackToggle.checked;
      } else {
        // Fallback to appSettings if toggle not found
        isEnabled = appSettings.sound_feedback !== false; // Default to true if not set
      }
      
      console.log('Sound feedback event:', type, 'Toggle checked:', soundFeedbackToggle?.checked, 'Is enabled:', isEnabled);
      
      if (isEnabled) {
        // Ensure audio context is initialized and resumed
        const ctx = getAudioContext();
        if (!ctx) {
          console.warn('AudioContext not available');
          return;
        }
        
        // Resume if suspended
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            console.log('Audio context resumed, playing sound:', type);
            if (type === 'start') {
              playBeepStart();
            } else if (type === 'stop') {
              playBeepStop();
            }
          }).catch(e => {
            console.error('Failed to resume audio context:', e);
            // Try to play anyway
            try {
              if (type === 'start') {
                playBeepStart();
              } else if (type === 'stop') {
                playBeepStop();
              }
            } catch (err) {
              console.error('Failed to play beep:', err);
            }
          });
        } else {
          // Context is already running
          if (type === 'start') {
            playBeepStart();
          } else if (type === 'stop') {
            playBeepStop();
          }
        }
      }
    });
  }

  // Update keyboard shortcuts display
  async function updateKeyboardShortcutsDisplay() {
    try {
      const settings = await ipc.getSettings();
      const holdHotkey = settings.holdHotkey || 'CommandOrControl+Super+Space';
      const toggleHotkey = settings.toggleHotkey || 'CommandOrControl+Shift+Space';
      
      const formatHotkey = (hotkey) => {
        return hotkey
          .replace(/CommandOrControl/gi, 'Ctrl')
          .replace(/Super/gi, 'Win')
          .replace(/\+/g, '+');
      };
      
      const holdDisplay = document.getElementById('current-hold-hotkey-display');
      const toggleDisplay = document.getElementById('current-toggle-hotkey-display');
      
      if (holdDisplay) holdDisplay.textContent = formatHotkey(holdHotkey);
      if (toggleDisplay) toggleDisplay.textContent = formatHotkey(toggleHotkey);
    } catch (e) {
      console.error('Error updating keyboard shortcuts display:', e);
    }
  }

  // Load microphone list
  async function loadMicrophoneList() {
    try {
      const devices = await ipc.listMicrophones();
      const select = document.getElementById('microphone-select');
      if (select && devices) {
        select.innerHTML = '';
        devices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.id || 'default';
          option.textContent = device.name || 'Auto-detect (Audio)';
          select.appendChild(option);
        });
        
        // Update description with current selection
        const desc = document.getElementById('microphone-desc');
        if (desc && devices.length > 0) {
          desc.textContent = devices[0].name || 'Auto-detect (Audio)';
        }
      }
    } catch (e) {
      console.error('Error loading microphone list:', e);
    }
  }

  // Load microphone list when microphone modal opens
  const microphoneModal = document.getElementById('microphone-modal');
  if (microphoneModal) {
    const changeMicrophoneBtn = document.getElementById('change-microphone-btn');
    if (changeMicrophoneBtn) {
      changeMicrophoneBtn.addEventListener('click', () => {
        loadMicrophoneList();
      });
    }
  }

  // Update microphone description when selection changes
  const microphoneSelect = document.getElementById('microphone-select');
  if (microphoneSelect) {
    microphoneSelect.addEventListener('change', (e) => {
      const desc = document.getElementById('microphone-desc');
      if (desc) {
        desc.textContent = e.target.options[e.target.selectedIndex].textContent;
      }
    });
  }

  // Dictionary functionality
  let editingSnippetId = null;
  let editingDictionaryWord = null;
  
  async function loadDictionary() {
    try {
      const words = await ipc.getDictionary();
      const dictionaryList = document.getElementById('dictionary-list');
      const dictionaryEmpty = document.getElementById('dictionary-empty');
      
      if (!dictionaryList) return;
      
      dictionaryList.innerHTML = '';
      
      if (words.length === 0) {
        dictionaryList.style.display = 'none';
        if (dictionaryEmpty) dictionaryEmpty.style.display = 'block';
        return;
      }
      
      dictionaryList.style.display = 'flex';
      if (dictionaryEmpty) dictionaryEmpty.style.display = 'none';
      
      words.forEach(word => {
        const item = document.createElement('div');
        item.className = 'dictionary-item';
        item.dataset.word = word;
        item.innerHTML = `
          <div class="dictionary-word-wrapper">
            <input type="text" class="dictionary-word-input" value="${escapeHtml(word)}" readonly />
          </div>
          <div class="dictionary-item-actions">
            <button class="history-action-icon copy-icon dictionary-copy-btn" data-word="${escapeHtml(word)}" title="Copy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="dictionary-edit-btn" data-word="${escapeHtml(word)}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="dictionary-delete-btn" data-word="${escapeHtml(word)}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        `;
        
        const wordInput = item.querySelector('.dictionary-word-input');
        const copyBtn = item.querySelector('.dictionary-copy-btn');
        const editBtn = item.querySelector('.dictionary-edit-btn');
        const deleteBtn = item.querySelector('.dictionary-delete-btn');
        
        // Copy functionality
        if (copyBtn) {
          copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              const textToCopy = word || '';
              if (!textToCopy) {
                showMessage('Nothing to copy');
                return;
              }

              // Try Electron clipboard first
              if (ipc && ipc.copyToClipboard) {
                const result = ipc.copyToClipboard(textToCopy);
                if (result && typeof result.then === 'function') {
                  // It's a promise (IPC fallback)
                  result.then((res) => {
                    if (res && res.success) {
                      showMessage('Copied');
                    } else {
                      // Try navigator clipboard as fallback
                      tryNavigatorClipboard(textToCopy);
                    }
                  }).catch(() => {
                    tryNavigatorClipboard(textToCopy);
                  });
                } else {
                  // Synchronous call succeeded
                  showMessage('Copied');
                }
              } else {
                tryNavigatorClipboard(textToCopy);
              }
            } catch (error) {
              console.error('Error copying to clipboard:', error);
              showMessage('Failed to copy');
            }

            function tryNavigatorClipboard(text) {
              if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                  showMessage('Copied');
                }).catch((err) => {
                  console.error('Navigator clipboard error:', err);
                  showMessage('Failed to copy');
                });
              } else {
                showMessage('Copy not available');
              }
            }
          });
        }
        
        // Edit functionality
        if (editBtn) {
          editBtn.addEventListener('click', () => {
            if (editingDictionaryWord) {
              // Cancel previous edit
              const prevItem = document.querySelector(`.dictionary-item[data-word="${editingDictionaryWord}"]`);
              if (prevItem) {
                const prevInput = prevItem.querySelector('.dictionary-word-input');
                if (prevInput) {
                  prevInput.value = editingDictionaryWord;
                  prevInput.readOnly = true;
                  prevItem.classList.remove('editing');
                }
              }
            }
            
            editingDictionaryWord = word;
            item.classList.add('editing');
            
            // Remove any existing listeners by cloning the input
            const newInput = wordInput.cloneNode(true);
            wordInput.parentNode.replaceChild(newInput, wordInput);
            newInput.readOnly = false;
            newInput.focus();
            newInput.select();
            
            // Save on Enter or blur
            const saveEdit = async () => {
              const newWord = newInput.value.trim().toLowerCase();
              if (newWord && newWord !== word) {
                // Check if word already exists
                const allWords = await ipc.getDictionary();
                if (allWords.includes(newWord)) {
                  showMessage('This word already exists in the dictionary');
                  newInput.value = word;
                  newInput.readOnly = true;
                  item.classList.remove('editing');
                  editingDictionaryWord = null;
                  return;
                }
                
                // Update word
                const result = await ipc.updateDictionaryWord(word, newWord);
                if (result.success) {
                  loadDictionary();
                } else {
                  showMessage(result.error || 'Failed to update word');
                  newInput.value = word;
                  newInput.readOnly = true;
                  item.classList.remove('editing');
                  editingDictionaryWord = null;
                }
              } else if (!newWord) {
                // Empty word, restore original
                newInput.value = word;
                newInput.readOnly = true;
                item.classList.remove('editing');
              } else {
                // Same word, just cancel edit
                newInput.readOnly = true;
                item.classList.remove('editing');
              }
              editingDictionaryWord = null;
            };
            
            const handleDictionaryKeyDown = (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                newInput.removeEventListener('keydown', handleDictionaryKeyDown);
                newInput.removeEventListener('blur', handleDictionaryBlur);
                saveEdit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                newInput.removeEventListener('keydown', handleDictionaryKeyDown);
                newInput.removeEventListener('blur', handleDictionaryBlur);
                newInput.value = word;
                newInput.readOnly = true;
                item.classList.remove('editing');
                editingDictionaryWord = null;
              }
            };
            
            const handleDictionaryBlur = () => {
              newInput.removeEventListener('keydown', handleDictionaryKeyDown);
              newInput.removeEventListener('blur', handleDictionaryBlur);
              saveEdit();
            };
            
            newInput.addEventListener('keydown', handleDictionaryKeyDown);
            newInput.addEventListener('blur', handleDictionaryBlur);
          });
        }
        
        // Delete functionality
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            await ipc.deleteDictionaryWord(word);
            loadDictionary();
          });
        }
        
        dictionaryList.appendChild(item);
      });
      } catch (e) {
      console.error('Error loading dictionary:', e);
    }
  }

  // Snippets functionality
  async function loadSnippets() {
    try {
      const snippets = await ipc.getSnippets();
      const snippetsList = document.getElementById('snippets-list');
      const snippetsEmpty = document.getElementById('snippets-empty');
      
      if (!snippetsList) return;
      
      snippetsList.innerHTML = '';
      
      if (snippets.length === 0) {
        snippetsList.style.display = 'none';
        if (snippetsEmpty) snippetsEmpty.style.display = 'block';
        return;
      }
      
      snippetsList.style.display = 'flex';
      if (snippetsEmpty) snippetsEmpty.style.display = 'none';
      
      snippets.forEach(snippet => {
        const item = document.createElement('div');
        item.className = 'snippets-item';
        item.innerHTML = `
          <div class="snippet-content">
            <div class="snippet-title">${escapeHtml(snippet.title || 'Untitled')}</div>
            <div class="snippet-text">${escapeHtml(snippet.text || '')}</div>
          </div>
          <div class="snippets-item-actions">
            <button class="history-action-icon copy-icon snippet-copy-btn" data-id="${snippet.id}" title="Copy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="dictionary-delete-btn snippet-edit-btn" data-id="${snippet.id}" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="dictionary-delete-btn snippet-delete-btn" data-id="${snippet.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        `;
        
        const copyBtn = item.querySelector('.snippet-copy-btn');
        const editBtn = item.querySelector('.snippet-edit-btn');
        const deleteBtn = item.querySelector('.snippet-delete-btn');
        
        if (copyBtn) {
          copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              const textToCopy = snippet.text || '';
              ipc.copyToClipboard(textToCopy);
              showMessage('Copied');
            } catch (error) {
              console.error('Error copying to clipboard:', error);
              showMessage('Failed to copy');
            }
          });
        }
        
        if (editBtn) {
          editBtn.addEventListener('click', () => {
            editingSnippetId = snippet.id;
            const editTitleInput = document.getElementById('edit-snippet-title-input');
            const editTextInput = document.getElementById('edit-snippet-text-input');
            if (editTitleInput) editTitleInput.value = snippet.title || '';
            if (editTextInput) editTextInput.value = snippet.text || '';
            const editModal = document.getElementById('edit-snippet-modal');
            if (editModal) editModal.classList.add('active');
          });
        }
        
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            await ipc.deleteSnippet(snippet.id);
            loadSnippets();
          });
        }
        
        snippetsList.appendChild(item);
      });
    } catch (e) {
      console.error('Error loading snippets:', e);
      }
  }

  // Notes functionality
  let isNotesRecording = false;
  let notesRecordingText = '';
  
  async function loadNotes() {
    try {
      const notes = await ipc.getNotes();
      const notesList = document.getElementById('notes-list');
      const notesEmpty = document.getElementById('notes-empty');
      
      if (!notesList) return;
      
      notesList.innerHTML = '';
      
      if (notes.length === 0) {
        notesList.style.display = 'none';
        if (notesEmpty) notesEmpty.style.display = 'block';
        return;
      }
      
      notesList.style.display = 'flex';
      if (notesEmpty) notesEmpty.style.display = 'none';
      
      notes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'notes-item';
        const date = new Date(note.timestamp);
        const timeStr = date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
        
        item.innerHTML = `
          <div class="note-content">
            <div class="note-text">${escapeHtml(note.text || '')}</div>
            <div class="note-time">${timeStr}</div>
          </div>
          <div class="notes-item-actions">
            <button class="dictionary-delete-btn note-copy-btn" data-text="${escapeHtml(note.text)}" title="Copy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="dictionary-delete-btn note-delete-btn" data-id="${note.id}" title="Delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        `;
        
        const copyBtn = item.querySelector('.note-copy-btn');
        const deleteBtn = item.querySelector('.note-delete-btn');
        
        if (copyBtn) {
          copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              ipc.copyToClipboard(note.text);
              showMessage('Copied');
            } catch (error) {
              console.error('Error copying to clipboard:', error);
              showMessage('Failed to copy');
            }
          });
        }
        
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async () => {
            await ipc.deleteNote(note.id);
            loadNotes();
          });
        }
        
        notesList.appendChild(item);
      });
    } catch (e) {
      console.error('Error loading notes:', e);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Load app settings on initialization
  try {
    loadAppSettings().then(() => {
      // System theme initialization removed
    }).catch(e => {
      console.error('Error loading app settings:', e);
    });
  } catch (e) {
    console.error('Error in loadAppSettings:', e);
  }
  
  // Update keyboard shortcuts display on initialization
  try {
    updateKeyboardShortcutsDisplay();
  } catch (e) {
    console.error('Error updating keyboard shortcuts display:', e);
  }
  
  // Update when settings change
  try {
    if (ipc.onHotkeyRegistered) {
      ipc.onHotkeyRegistered(() => {
        try {
          updateKeyboardShortcutsDisplay();
        } catch (e) {
          console.error('Error in hotkey registered callback:', e);
        }
      });
    }
  } catch (e) {
    console.error('Error setting up hotkey registered listener:', e);
  }
  
  // Comprehensive initialization function
  function initializeAll() {
    console.log('Initializing all app functionality...');
    
    try {
      // Re-query all elements
      navItems = document.querySelectorAll('.nav-item[data-page]');
      pages = document.querySelectorAll('.page');
      settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
      settingsPages = document.querySelectorAll('.settings-page');
      
      console.log('Elements found:', {
        navItems: navItems.length,
        pages: pages.length,
        settingsNavItems: settingsNavItems.length,
        settingsPages: settingsPages.length
      });
      
      // Setup navigation
      setupNavigation();
      
      // Setup settings navigation
      setupSettingsNavigation();
      
      // Initialize History retention dropdown (now on home page)
      const historyRetentionSelect = document.getElementById('history-retention');
      if (historyRetentionSelect) {
        // Load saved retention setting
        ipc.getAppSettings().then(settings => {
          if (settings.history_retention) {
            historyRetentionSelect.value = settings.history_retention;
          }
        });
        
        historyRetentionSelect.addEventListener('change', async (e) => {
          const retention = e.target.value;
          await ipc.saveAppSettings({ history_retention: retention });
          showMessage('History retention setting saved');
        });
      }
      
      // Initialize Dictionary tab
      const newWordBtn = document.getElementById('new-word-btn');
      const addWordSubmitBtn = document.getElementById('add-word-submit-btn');
      const newWordInput = document.getElementById('new-word-input');
      
      if (newWordBtn) {
        newWordBtn.addEventListener('click', () => {
          const modal = document.getElementById('add-word-modal');
          if (modal) {
            modal.classList.add('active');
            if (newWordInput) {
              setTimeout(() => newWordInput.focus(), 100);
            }
          }
        });
      }
      
      if (addWordSubmitBtn) {
        addWordSubmitBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (newWordInput && newWordInput.value.trim()) {
            try {
              const word = newWordInput.value.trim();
              console.log('Attempting to add word:', word);
              const result = await ipc.addDictionaryWord(word);
              console.log('Add word result:', result);
              
              if (result && result.success) {
                newWordInput.value = '';
                const modal = document.getElementById('add-word-modal');
                if (modal) modal.classList.remove('active');
                loadDictionary();
                showMessage('Word added successfully');
              } else {
                const errorMsg = result && result.error ? result.error : 'This word already exists in the dictionary';
                console.log('Word add failed:', errorMsg);
                showMessage(errorMsg);
              }
            } catch (error) {
              console.error('Error adding word:', error);
              showMessage('Failed to add word. Please try again.');
            }
          } else {
            showMessage('Please enter a word');
          }
        });
      }
      
      if (newWordInput) {
        newWordInput.addEventListener('keypress', async (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            
            if (newWordInput.value.trim()) {
              try {
                const word = newWordInput.value.trim();
                const result = await ipc.addDictionaryWord(word);
                
                if (result && result.success) {
                  newWordInput.value = '';
                  const modal = document.getElementById('add-word-modal');
                  if (modal) modal.classList.remove('active');
                  loadDictionary();
                  showMessage('Word added successfully');
                } else {
                  const errorMsg = result && result.error ? result.error : 'This word already exists in the dictionary';
                  showMessage(errorMsg);
                }
              } catch (error) {
                console.error('Error adding word:', error);
                showMessage('Failed to add word. Please try again.');
              }
            } else {
              showMessage('Please enter a word');
            }
          }
        });
      }
      
      // Initialize Snippets tab
      const newSnippetBtn = document.getElementById('new-snippet-btn');
      const addSnippetSubmitBtn = document.getElementById('add-snippet-submit-btn');
      const editSnippetSubmitBtn = document.getElementById('edit-snippet-submit-btn');
      
      if (newSnippetBtn) {
        newSnippetBtn.addEventListener('click', () => {
          const modal = document.getElementById('add-snippet-modal');
          if (modal) {
            modal.classList.add('active');
            const titleInput = document.getElementById('snippet-title-input');
            const textInput = document.getElementById('snippet-text-input');
            if (titleInput) titleInput.value = '';
            if (textInput) textInput.value = '';
            setTimeout(() => {
              if (titleInput) titleInput.focus();
            }, 100);
          }
        });
      }
      
      if (addSnippetSubmitBtn) {
        addSnippetSubmitBtn.addEventListener('click', async () => {
          const titleInput = document.getElementById('snippet-title-input');
          const textInput = document.getElementById('snippet-text-input');
          if (titleInput && textInput) {
            await ipc.addSnippet({
              title: titleInput.value.trim() || 'Untitled',
              text: textInput.value.trim()
            });
            titleInput.value = '';
            textInput.value = '';
            const modal = document.getElementById('add-snippet-modal');
            if (modal) modal.classList.remove('active');
            loadSnippets();
          }
        });
      }
      
      if (editSnippetSubmitBtn) {
        editSnippetSubmitBtn.addEventListener('click', async () => {
          if (editingSnippetId) {
            const titleInput = document.getElementById('edit-snippet-title-input');
            const textInput = document.getElementById('edit-snippet-text-input');
            if (titleInput && textInput) {
              await ipc.updateSnippet(editingSnippetId, {
                title: titleInput.value.trim() || 'Untitled',
                text: textInput.value.trim()
              });
              editingSnippetId = null;
              const modal = document.getElementById('edit-snippet-modal');
              if (modal) modal.classList.remove('active');
              loadSnippets();
            }
          }
        });
      }
      
      // Initialize Notes tab
      const notesMicBtn = document.getElementById('notes-mic-btn');
      const notesInputContent = document.getElementById('notes-input-content');
      const notesInputPlaceholder = document.getElementById('notes-input-placeholder');
      const notesRefreshBtn = document.getElementById('notes-refresh-btn');
      
      if (notesMicBtn) {
        notesMicBtn.addEventListener('click', () => {
          if (!isNotesRecording) {
            isNotesRecording = true;
            notesMicBtn.classList.add('recording');
            notesRecordingText = '';
            if (notesInputPlaceholder) notesInputPlaceholder.style.display = 'none';
            if (notesInputContent) {
              notesInputContent.style.display = 'block';
              notesInputContent.textContent = 'Listening...';
            }
            ipc.toggleRecording();
          } else {
            isNotesRecording = false;
            notesMicBtn.classList.remove('recording');
            if (notesInputContent && notesRecordingText) {
              notesInputContent.textContent = notesRecordingText;
            }
            ipc.toggleRecording();
          }
        });
      }
      
      if (notesRefreshBtn) {
        notesRefreshBtn.addEventListener('click', () => {
          loadNotes();
        });
      }
      
      // Listen for transcriptions in Notes tab
      if (ipc.onTranscription) {
        ipc.onTranscription((text) => {
          if (isNotesRecording && currentPage === 'notes') {
            notesRecordingText = text;
            if (notesInputContent) {
              notesInputContent.textContent = text;
            }
          }
        });
      }
      
      // Listen for recording stop to save note
      if (ipc.onRecordingStop) {
        ipc.onRecordingStop(() => {
          if (isNotesRecording && currentPage === 'notes' && notesRecordingText.trim()) {
            ipc.addNote({ text: notesRecordingText.trim() }).then(() => {
              loadNotes();
              if (notesInputContent) {
                notesInputContent.textContent = '';
                notesInputContent.style.display = 'none';
              }
              if (notesInputPlaceholder) notesInputPlaceholder.style.display = 'block';
              notesRecordingText = '';
            });
          }
          isNotesRecording = false;
          if (notesMicBtn) notesMicBtn.classList.remove('recording');
        });
      }
      
      // Re-initialize hotkey display click handler
      const hotkeyDisplay = document.getElementById('current-hold-hotkey');
      if (hotkeyDisplay) {
        hotkeyDisplay.style.cursor = 'pointer';
        // Remove old listener if exists and add new one
        const newHandler = (e) => {
          e.preventDefault();
          e.stopPropagation();
          try {
            navigateToPage('settings');
            navigateToSettingsPage('general');
            setTimeout(() => {
              const changeShortcutsBtn = document.getElementById('change-shortcuts-btn');
              if (changeShortcutsBtn) {
                changeShortcutsBtn.click();
              }
            }, 100);
          } catch (err) {
            console.error('Error navigating to shortcuts:', err);
          }
        };
        // Clone to remove old listeners
        const newHotkeyDisplay = hotkeyDisplay.cloneNode(true);
        hotkeyDisplay.parentNode.replaceChild(newHotkeyDisplay, hotkeyDisplay);
        newHotkeyDisplay.style.cursor = 'pointer';
        newHotkeyDisplay.addEventListener('click', newHandler);
      }
      
      console.log('All initialization complete');
    } catch (e) {
      console.error('Error in comprehensive initialization:', e);
    }
  }
  
  // Initialize when DOM is ready - ensure it happens after everything is loaded
  function ensureInitialization() {
    // Wait for DOM to be fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Double-check that elements exist
        setTimeout(() => {
          initializeAll();
          // Also call setup functions directly as backup
          setupNavigation();
          setupSettingsNavigation();
        }, 200);
      });
    } else {
      // DOM already loaded, but wait a bit to ensure all elements are ready
      setTimeout(() => {
        initializeAll();
        // Also call setup functions directly as backup
        setupNavigation();
        setupSettingsNavigation();
      }, 200);
    }
  }
  
  // Call initialization
  ensureInitialization();
  
  // Also try to initialize after a longer delay as a fallback
  setTimeout(() => {
    if (!navigationSetup) {
      console.warn('Navigation not set up after delay, retrying...');
      setupNavigation();
    }
    if (!settingsNavigationSetup) {
      console.warn('Settings navigation not set up after delay, retrying...');
      setupSettingsNavigation();
    }
  }, 1000);
  
  // Ensure basic navigation works even if other parts fail
  console.log('Renderer script loaded. Navigation items:', navItems?.length || 0, 'Settings nav items:', settingsNavItems?.length || 0);
  
  // ========================================
  // Logs & Debugging Functionality
  // ========================================
  
  async function initializeLogsTab() {
    // Get logs directory and display it
    try {
      const result = await window.voiceApp.getLogsDirectory();
      if (result.success) {
        const logsLocationDesc = document.getElementById('logs-location-desc');
        if (logsLocationDesc) {
          logsLocationDesc.textContent = result.directory;
        }
      }
    } catch (e) {
      console.error('Failed to get logs directory:', e);
    }
  }
  
  // Open logs folder button
  const openLogsBtn = document.getElementById('open-logs-btn');
  if (openLogsBtn) {
    openLogsBtn.addEventListener('click', async () => {
      try {
        await window.voiceApp.openLogsDirectory();
      } catch (e) {
        console.error('Failed to open logs directory:', e);
        alert('Failed to open logs directory: ' + e.message);
      }
    });
  }
  
  // View logs buttons
  const logsViewer = document.getElementById('logs-viewer');
  
  async function viewLogs(category, buttonElement) {
    if (!logsViewer) return;
    
    try {
      // Disable button while loading
      if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = 'Loading...';
      }
      
      const result = await window.voiceApp.getRecentLogs(category, 100);
      
      if (result.success) {
        logsViewer.textContent = result.logs || 'No logs available.';
        logsViewer.style.display = 'block';
        
        // Scroll to bottom
        logsViewer.scrollTop = logsViewer.scrollHeight;
      } else {
        logsViewer.textContent = `Error loading logs: ${result.error}`;
        logsViewer.style.display = 'block';
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
      logsViewer.textContent = `Error: ${e.message}`;
      logsViewer.style.display = 'block';
    } finally {
      // Re-enable button
      if (buttonElement) {
        buttonElement.disabled = false;
        // Restore original text based on category
        const categoryNames = {
          main: 'Main',
          typing: 'Typing',
          download: 'Download',
          whisper: 'Whisper'
        };
        buttonElement.textContent = categoryNames[category] || category;
      }
    }
  }
  
  const viewMainLogsBtn = document.getElementById('view-main-logs-btn');
  const viewTypingLogsBtn = document.getElementById('view-typing-logs-btn');
  const viewDownloadLogsBtn = document.getElementById('view-download-logs-btn');
  const viewWhisperLogsBtn = document.getElementById('view-whisper-logs-btn');
  
  if (viewMainLogsBtn) {
    viewMainLogsBtn.addEventListener('click', () => viewLogs('main', viewMainLogsBtn));
  }
  if (viewTypingLogsBtn) {
    viewTypingLogsBtn.addEventListener('click', () => viewLogs('typing', viewTypingLogsBtn));
  }
  if (viewDownloadLogsBtn) {
    viewDownloadLogsBtn.addEventListener('click', () => viewLogs('download', viewDownloadLogsBtn));
  }
  if (viewWhisperLogsBtn) {
    viewWhisperLogsBtn.addEventListener('click', () => viewLogs('whisper', viewWhisperLogsBtn));
  }
  
  // Initialize logs tab when it becomes active
  const logsNavBtn = document.querySelector('[data-settings-page="logs"]');
  if (logsNavBtn) {
    logsNavBtn.addEventListener('click', () => {
      setTimeout(initializeLogsTab, 100);
    });
  }
  
  console.log('Logs & Debugging functionality initialized');
  
  // ========================================
  // Active Model Display & Updates
  // ========================================
  
  async function updateActiveModelDisplay() {
    try {
      const result = await window.voiceApp.getActiveModel();
      if (result.success) {
        const activeModelDesc = document.getElementById('active-model-desc');
        const activeModelStatus = document.getElementById('active-model-status');
        
        if (activeModelDesc) {
          activeModelDesc.textContent = `${result.model.toUpperCase()} (${result.size_mb} MB) - ${result.description}`;
        }
        
        if (activeModelStatus) {
          if (result.ready) {
            activeModelStatus.textContent = '✓ Ready';
            activeModelStatus.style.color = 'rgba(46, 213, 115, 1)'; // Green
          } else {
            activeModelStatus.textContent = '⏳ Loading...';
            activeModelStatus.style.color = 'rgba(255, 255, 255, 0.75)'; // White
          }
        }
      }
    } catch (e) {
      console.error('Failed to update active model display:', e);
    }
  }
  
  // Update active model display on load and when settings tab is opened
  const modelNavBtn = document.querySelector('[data-settings-page="model"]');
  if (modelNavBtn) {
    modelNavBtn.addEventListener('click', () => {
      setTimeout(updateActiveModelDisplay, 100);
    });
  }
  
  // Listen for whisper-ready event
  window.voiceApp.onWhisperReady((data) => {
    console.log('Whisper model ready:', data);
    whisperModelReady = true;
    const loadTime = Date.now() - modelLoadStartTime;
    console.log(`✓ Model loaded in ${(loadTime / 1000).toFixed(1)}s`);
    updateActiveModelDisplay();
  });
  
  // Listen for whisper-error event
  window.voiceApp.onWhisperError((error) => {
    console.error('Whisper model error:', error);
    whisperModelReady = false;
    const activeModelStatus = document.getElementById('active-model-status');
    if (activeModelStatus) {
      activeModelStatus.textContent = '✗ Error loading model';
      activeModelStatus.style.color = 'rgba(255, 71, 87, 1)'; // Red
    }
  });
  
  // Update model display on page load
  setTimeout(updateActiveModelDisplay, 1000);
  
  console.log('Active model display functionality initialized');
  
  // ============================================
  // Tray Menu Handlers
  // ============================================
  
  // Navigate to settings from tray
  if (window.voiceApp.onNavigateToSettings) {
    window.voiceApp.onNavigateToSettings(() => {
      console.log('Navigating to settings from tray menu');
      navigateToPage('settings');
    });
  }
  
  // Open dictionary from tray
  if (window.voiceApp.onOpenDictionary) {
    window.voiceApp.onOpenDictionary(() => {
      console.log('Opening dictionary from tray menu');
      navigateToPage('settings');
      // Navigate to a hypothetical dictionary tab (you can implement this later)
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { 
          message: 'Dictionary feature coming soon!', 
          type: 'info' 
        } 
      }));
    });
  }
  
  // Handle microphone changes from tray
  if (window.voiceApp.onMicrophoneChanged) {
    window.voiceApp.onMicrophoneChanged((deviceId) => {
      console.log('Microphone changed to:', deviceId);
      window.dispatchEvent(new CustomEvent('show-toast', { 
        detail: { 
          message: 'Microphone updated successfully', 
          type: 'success' 
        } 
      }));
    });
  }
  
  console.log('Tray menu handlers initialized');
})();
