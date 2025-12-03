/**
 * Accessibility Features for SONU
 * Implements screen reader support, keyboard navigation, and WCAG compliance
 */

class AccessibilityManager {
  constructor() {
    this.isEnabled = true;
    this.screenReaderMode = false;
    this.highContrastMode = false;
    this.reducedMotion = false;
    this.focusTraps = new Map();
    this.liveRegions = new Map();

    this.initialize();
  }

  initialize() {
    if (!this.isEnabled) return;

    this.detectScreenReader();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupLiveRegions();
    this.setupHighContrastDetection();
    this.setupReducedMotionDetection();
    this.addAccessibilityAttributes();

    console.log('Accessibility features initialized');
  }

  detectScreenReader() {
    if (typeof window === 'undefined') return;
    
    const isScreenReaderActive = (
      /NVDA|JAWS|VoiceOver|TalkBack|NV Access|Window-Eyes/i.test(navigator.userAgent) ||
      (window.speechSynthesis && window.speechSynthesis.speaking) ||
      window.matchMedia('(prefers-contrast: high)').matches ||
      window.matchMedia('(forced-colors: active)').matches
    );

    this.screenReaderMode = isScreenReaderActive;

    if (this.screenReaderMode && typeof document !== 'undefined') {
      document.body.classList.add('screen-reader-active');
      this.enhanceScreenReaderSupport();
    }

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.screenReaderMode = e.matches;
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('screen-reader-active', this.screenReaderMode);
      }
    });
  }

  enhanceScreenReaderSupport() {
    this.addAriaLabels();
    this.addLiveRegions();
    this.addSkipLinks();
  }

  addAriaLabels() {
    if (typeof document === 'undefined') return;
    
    const elementsToLabel = [
      { selector: '.nav-item', label: (el) => `Navigate to ${el.dataset.page} page` },
      { selector: '.theme-toggle-btn', label: 'Toggle theme between light and dark mode' },
      { selector: '.window-control', label: (el) => `${el.title} window` },
      { selector: '.history-item', label: (el) => `Transcription: ${el.querySelector('.history-text')?.textContent || 'Empty'}` },
      { selector: '.stat-card', label: (el) => {
        const value = el.querySelector('.stat-value')?.textContent;
        const label = el.querySelector('.stat-label')?.textContent;
        return `${value} ${label}`;
      }},
      { selector: '.settings-nav-item', label: (el) => `Settings: ${el.textContent.trim()}` },
      { selector: '.theme-option', label: (el) => `Theme: ${el.dataset.theme || 'Unknown'}` },
      { selector: '.modal', label: 'Dialog' }
    ];

    elementsToLabel.forEach(({ selector, label }) => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
          const ariaLabel = typeof label === 'function' ? label(el) : label;
          el.setAttribute('aria-label', ariaLabel);
        }
      });
    });
  }

  addLiveRegions() {
    if (typeof document === 'undefined') return;
    
    const liveRegions = [
      { id: 'transcription-live-region', 'aria-live': 'polite', role: 'status' },
      { id: 'recording-live-region', 'aria-live': 'assertive', role: 'alert' },
      { id: 'error-live-region', 'aria-live': 'assertive', role: 'alert' },
      { id: 'progress-live-region', 'aria-live': 'polite', role: 'status' }
    ];

    liveRegions.forEach(region => {
      let element = document.getElementById(region.id);
      if (!element) {
        element = document.createElement('div');
        element.id = region.id;
        element.setAttribute('aria-live', region['aria-live']);
        element.setAttribute('aria-atomic', 'true');
        element.setAttribute('role', region.role);
        element.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden';
        document.body.appendChild(element);
      }
      this.liveRegions.set(region.id, element);
    });
  }

  setupLiveRegions() {
    this.addLiveRegions();
  }

  announce(message, priority = 'polite') {
    const liveRegion = this.liveRegions.get('transcription-live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;

      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  setupKeyboardNavigation() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    this.makeFocusable([
      '.nav-item',
      '.settings-nav-item',
      '.theme-option',
      '.history-item',
      '.modal-close',
      '.btn-primary',
      '.btn-secondary',
      '.settings-change-btn',
      '.settings-toggle',
      '.icon-btn'
    ]);
  }

  makeFocusable(selectors) {
    if (typeof document === 'undefined') return;
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.hasAttribute('tabindex') && !el.matches('button, input, select, textarea, a[href]')) {
          el.setAttribute('tabindex', '0');
        }
      });
    });
  }

  handleKeyboardNavigation(e) {
    const activeElement = document.activeElement;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.handleArrowNavigation(e, activeElement);
    }

    if (e.key === 'Enter' || e.key === ' ') {
      this.handleActivation(e, activeElement);
    }

    if (e.key === 'Escape') {
      this.handleEscape(e, activeElement);
    }

    if (e.altKey || e.ctrlKey || e.metaKey) {
      this.handleShortcuts(e);
    }
  }

  handleArrowNavigation(e, activeElement) {
    if (activeElement.closest('.sidebar')) {
      e.preventDefault();
      const items = Array.from(activeElement.closest('.sidebar').querySelectorAll('.nav-item[tabindex="0"]'));
      const currentIndex = items.indexOf(activeElement);
      let nextIndex;

      if (e.key === 'ArrowDown') {
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
      } else if (e.key === 'ArrowUp') {
        nextIndex = Math.max(currentIndex - 1, 0);
      }

      if (nextIndex !== undefined && items[nextIndex]) {
        items[nextIndex].focus();
        this.announce(`Selected ${items[nextIndex].dataset.page} page`);
      }
    }

    if (activeElement.closest('.settings-sidebar')) {
      e.preventDefault();
      const items = Array.from(activeElement.closest('.settings-sidebar').querySelectorAll('.settings-nav-item[tabindex="0"]'));
      const currentIndex = items.indexOf(activeElement);
      let nextIndex;

      if (e.key === 'ArrowDown') {
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
      } else if (e.key === 'ArrowUp') {
        nextIndex = Math.max(currentIndex - 1, 0);
      }

      if (nextIndex !== undefined && items[nextIndex]) {
        items[nextIndex].focus();
        this.announce(`Selected ${items[nextIndex].dataset.settingsPage} settings`);
      }
    }
  }

  handleActivation(e, activeElement) {
    if (activeElement.matches('button, [role="button"], .nav-item, .settings-nav-item, .theme-option')) {
      e.preventDefault();
      activeElement.click();
    }
  }

  handleEscape(e, activeElement) {
    if (typeof document === 'undefined') return;
    
    const modal = activeElement.closest('.modal.active');
    if (modal) {
      e.preventDefault();
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) closeBtn.click();
      this.announce('Dialog closed');
    }

    if (activeElement.getAttribute('aria-expanded') === 'true') {
      e.preventDefault();
      activeElement.setAttribute('aria-expanded', 'false');
      this.announce('Collapsed');
    }
  }

  handleShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          document.querySelector('[data-page="home"]')?.focus();
          this.announce('Home page selected');
          break;
        case '/':
          e.preventDefault();
          this.showKeyboardShortcuts();
          break;
      }
    }
  }

  showKeyboardShortcuts() {
    const shortcuts = [
      'Ctrl+H: Go to Home',
      'Ctrl+/: Show this help',
      'Tab: Navigate between elements',
      'Enter/Space: Activate element',
      'Escape: Close dialogs',
      'Arrow keys: Navigate menus'
    ];

    const message = 'Keyboard shortcuts: ' + shortcuts.join('. ');
    this.announce(message, 'assertive');
  }

  setupFocusManagement() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal.active');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.matches('.modal-close, .btn-secondary[data-modal]')) {
        const modalId = e.target.dataset.modal || e.target.closest('[data-modal]')?.dataset.modal;
        if (modalId) {
          const modal = document.getElementById(modalId);
          if (modal) {
            this.restoreFocus(modal);
          }
        }
      }
    });
  }

  trapFocus(e, modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  restoreFocus(modal) {
    if (!this.focusTraps.has(modal.id)) {
      this.focusTraps.set(modal.id, document.activeElement);
    }

    const previouslyFocused = this.focusTraps.get(modal.id);
    if (previouslyFocused && document.contains(previouslyFocused)) {
      setTimeout(() => previouslyFocused.focus(), 100);
    }
    this.focusTraps.delete(modal.id);
  }

  addSkipLinks() {
    if (typeof document === 'undefined') return;
    
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#sidebar', text: 'Skip to navigation' }
    ];

    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.style.cssText = 'position:absolute;top:-40px;left:6px;z-index:1000;transition:top 0.3s';

    skipLinks.forEach(link => {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      a.style.cssText = 'display:inline-block;padding:8px;background:var(--accent-purple,#7c5cff);color:white;text-decoration:none;border-radius:4px;margin-right:8px';
      a.addEventListener('focus', () => {
        skipLinksContainer.style.top = '6px';
      });
      a.addEventListener('blur', () => {
        skipLinksContainer.style.top = '-40px';
      });
      skipLinksContainer.appendChild(a);
    });

    document.body.insertBefore(skipLinksContainer, document.body.firstChild);
  }

  setupHighContrastDetection() {
    if (typeof window === 'undefined') return;
    
    const highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedColorsMediaQuery = window.matchMedia('(forced-colors: active)');

    const updateHighContrast = () => {
      this.highContrastMode = highContrastMediaQuery.matches || forcedColorsMediaQuery.matches;
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('high-contrast', this.highContrastMode);
      }

      if (this.highContrastMode) {
        this.enhanceHighContrast();
      }
    };

    highContrastMediaQuery.addEventListener('change', updateHighContrast);
    forcedColorsMediaQuery.addEventListener('change', updateHighContrast);
    updateHighContrast();
  }

  setupReducedMotionDetection() {
    if (typeof window === 'undefined') return;
    
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateReducedMotion = () => {
      this.reducedMotion = reducedMotionMediaQuery.matches;
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('reduced-motion', this.reducedMotion);
      }

      if (this.reducedMotion) {
        this.disableAnimations();
      }
    };

    reducedMotionMediaQuery.addEventListener('change', updateReducedMotion);
    updateReducedMotion();
  }

  enhanceHighContrast() {
    if (typeof document === 'undefined') return;
    
    if (document.getElementById('high-contrast-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'high-contrast-styles';
    style.textContent = `
      .high-contrast {
        --text-primary: black !important;
        --text-secondary: black !important;
        --bg-primary: white !important;
        --bg-secondary: white !important;
        --border-color: black !important;
      }
      .high-contrast button,
      .high-contrast input,
      .high-contrast select {
        border: 2px solid black !important;
      }
      .high-contrast .nav-item.active {
        background: black !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
  }

  disableAnimations() {
    if (typeof document === 'undefined') return;
    
    if (document.getElementById('reduced-motion-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'reduced-motion-styles';
    style.textContent = `
      .reduced-motion *,
      .reduced-motion *::before,
      .reduced-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  addAccessibilityAttributes() {
    if (typeof document === 'undefined') return;
    
    document.querySelectorAll('.modal').forEach(modal => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.setAttribute('role', 'button');
      item.setAttribute('aria-current', item.classList.contains('active') ? 'page' : 'false');
    });

    document.querySelectorAll('.progress-bar').forEach(progress => {
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
      progress.setAttribute('aria-valuenow', '0');
    });
  }

  setFocus(element) {
    if (element && element.focus) {
      element.focus();
      if (this.screenReaderMode) {
        this.announce(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`);
      }
    }
  }

  onTranscription(text) {
    this.announce(`Transcribed: ${text}`, 'polite');
  }

  onRecordingStart() {
    this.announce('Recording started', 'assertive');
  }

  onRecordingStop() {
    this.announce('Recording stopped', 'assertive');
  }

  onError(error) {
    this.announce(`Error: ${error}`, 'assertive');
  }

  onProgress(percent, message) {
    this.announce(`${message} ${percent}% complete`, 'polite');
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.body.classList.remove('screen-reader-active', 'high-contrast', 'reduced-motion');
    }
    this.liveRegions.clear();
    this.focusTraps.clear();
    console.log('Accessibility features destroyed');
  }
}

// Singleton instance
let accessibilityManagerInstance = null;

function getAccessibilityManager() {
  if (!accessibilityManagerInstance) {
    accessibilityManagerInstance = new AccessibilityManager();
  }
  return accessibilityManagerInstance;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AccessibilityManager = AccessibilityManager;
  window.getAccessibilityManager = getAccessibilityManager;

  window.addEventListener('error', (event) => {
    const accessibility = getAccessibilityManager();
    accessibility.onError(event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const accessibility = getAccessibilityManager();
    accessibility.onError(event.reason?.message || 'Unhandled promise rejection');
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AccessibilityManager, getAccessibilityManager };
}
