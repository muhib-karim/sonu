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

  // Screen Reader Detection and Support
  detectScreenReader() {
    // Detect screen readers through various methods
    const isScreenReaderActive = (
      // Check for screen reader specific user agents
      /NVDA|JAWS|VoiceOver|TalkBack|NV Access|Window-Eyes/i.test(navigator.userAgent) ||
      // Check for screen reader APIs
      (window.speechSynthesis && window.speechSynthesis.speaking) ||
      // Check for high contrast mode (often used with screen readers)
      window.matchMedia('(prefers-contrast: high)').matches ||
      // Check for forced colors mode
      window.matchMedia('(forced-colors: active)').matches
    );

    this.screenReaderMode = isScreenReaderActive;

    if (this.screenReaderMode) {
      document.body.classList.add('screen-reader-active');
      this.enhanceScreenReaderSupport();
    }

    // Listen for changes in screen reader usage
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.screenReaderMode = e.matches;
      document.body.classList.toggle('screen-reader-active', this.screenReaderMode);
    });
  }

  enhanceScreenReaderSupport() {
    // Add screen reader specific enhancements
    this.addAriaLabels();
    this.addLiveRegions();
    this.improveKeyboardNavigation();
    this.addSkipLinks();
  }

  addAriaLabels() {
    // Add comprehensive ARIA labels throughout the app
    const elementsToLabel = [
      { selector: '.nav-item', label: (el) => `Navigate to ${el.dataset.page} page` },
      { selector: '.theme-toggle-btn', label: 'Toggle theme between light and dark mode' },
      { selector: '#theme-toggle-btn', label: 'Toggle between light and dark theme' },
      { selector: '.window-control', label: (el) => `${el.title} window` },
      { selector: '#current-hold-hotkey', label: 'Current dictation hotkey, click to change' },
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
    // Create live regions for dynamic content announcements
    const liveRegions = [
      { id: 'transcription-live-region', 'aria-live': 'polite', 'aria-atomic': 'true', role: 'status' },
      { id: 'recording-live-region', 'aria-live': 'assertive', 'aria-atomic': 'true', role: 'alert' },
      { id: 'error-live-region', 'aria-live': 'assertive', 'aria-atomic': 'true', role: 'alert' },
      { id: 'progress-live-region', 'aria-live': 'polite', 'aria-atomic': 'false', role: 'status' }
    ];

    liveRegions.forEach(region => {
      let element = document.getElementById(region.id);
      if (!element) {
        element = document.createElement('div');
        element.id = region.id;
        Object.assign(element, region);
        element.style.position = 'absolute';
        element.style.left = '-10000px';
        element.style.width = '1px';
        element.style.height = '1px';
        element.style.overflow = 'hidden';
        document.body.appendChild(element);
      }
      this.liveRegions.set(region.id, element);
    });
  }

  announceToScreenReader(message, region = 'transcription-live-region', priority = 'polite') {
    const liveRegion = this.liveRegions.get(region);
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;

      // Clear after announcement to allow re-announcement of same message
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  // Keyboard Navigation
  setupKeyboardNavigation() {
    // Enhanced keyboard navigation for all interactive elements
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e);
    });

    // Make all interactive elements focusable
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
      '.settings-select',
      '.icon-btn'
    ]);
  }

  makeFocusable(selectors) {
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

    // Enhanced Tab navigation
    if (e.key === 'Tab') {
      // Tab navigation is handled by browser, but we can enhance it
      return;
    }

    // Arrow key navigation for custom components
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      this.handleArrowNavigation(e, activeElement);
    }

    // Enter/Space activation
    if (e.key === 'Enter' || e.key === ' ') {
      this.handleActivation(e, activeElement);
    }

    // Escape key handling
    if (e.key === 'Escape') {
      this.handleEscape(e, activeElement);
    }

    // Shortcut keys
    if (e.altKey || e.ctrlKey || e.metaKey) {
      this.handleShortcuts(e);
    }
  }

  handleArrowNavigation(e, activeElement) {
    // Navigate through navigation menus
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
        this.announceToScreenReader(`Selected ${items[nextIndex].dataset.page} page`);
      }
    }

    // Navigate through settings tabs
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
        this.announceToScreenReader(`Selected ${items[nextIndex].dataset.settingsPage} settings`);
      }
    }

    // Navigate through theme options
    if (activeElement.closest('.themes-grid')) {
      e.preventDefault();
      const items = Array.from(activeElement.closest('.themes-grid').querySelectorAll('.theme-option[tabindex="0"]'));
      const currentIndex = items.indexOf(activeElement);
      let nextIndex;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % items.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + items.length) % items.length;
      } else if (e.key === 'ArrowDown') {
        nextIndex = Math.min(currentIndex + 4, items.length - 1); // Assuming 4 columns
      } else if (e.key === 'ArrowUp') {
        nextIndex = Math.max(currentIndex - 4, 0);
      }

      if (nextIndex !== undefined && items[nextIndex]) {
        items[nextIndex].focus();
        this.announceToScreenReader(`Selected ${items[nextIndex].dataset.theme} theme`);
      }
    }
  }

  handleActivation(e, activeElement) {
    // Activate buttons and interactive elements
    if (activeElement.matches('button, [role="button"], .nav-item, .settings-nav-item, .theme-option')) {
      e.preventDefault();
      activeElement.click();
    }
  }

  handleEscape(e, activeElement) {
    // Close modals
    const modal = activeElement.closest('.modal.active');
    if (modal) {
      e.preventDefault();
      const closeBtn = modal.querySelector('.modal-close');
      if (closeBtn) closeBtn.click();
      this.announceToScreenReader('Dialog closed');
    }

    // Close expanded elements
    if (activeElement.getAttribute('aria-expanded') === 'true') {
      e.preventDefault();
      activeElement.setAttribute('aria-expanded', 'false');
      this.announceToScreenReader('Collapsed');
    }
  }

  handleShortcuts(e) {
    // Application shortcuts for accessibility
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'h':
          e.preventDefault();
          document.querySelector('[data-page="home"]')?.focus();
          this.announceToScreenReader('Home page selected');
          break;
        case 's':
          e.preventDefault();
          document.querySelector('[data-page="settings"]')?.focus();
          this.announceToScreenReader('Settings page selected');
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
      'Ctrl+S: Go to Settings',
      'Ctrl+/: Show this help',
      'Tab: Navigate between elements',
      'Enter/Space: Activate element',
      'Escape: Close dialogs',
      'Arrow keys: Navigate menus'
    ];

    const message = 'Keyboard shortcuts:\n' + shortcuts.join('\n');
    this.announceToScreenReader(message, 'transcription-live-region', 'assertive');
  }

  // Focus Management
  setupFocusManagement() {
    // Focus trap for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal.active');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });

    // Restore focus when modals close
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

    // Focus management for dynamic content
    this.setupMutationObserver();
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
    // Store the element that opened the modal
    if (!this.focusTraps.has(modal.id)) {
      this.focusTraps.set(modal.id, document.activeElement);
    }

    // Restore focus when modal closes
    const previouslyFocused = this.focusTraps.get(modal.id);
    if (previouslyFocused && document.contains(previouslyFocused)) {
      setTimeout(() => previouslyFocused.focus(), 100);
    }
    this.focusTraps.delete(modal.id);
  }

  setupMutationObserver() {
    // Watch for dynamically added focusable elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Make newly added interactive elements focusable
            if (node.matches('button, input, select, textarea') && !node.hasAttribute('tabindex')) {
              node.setAttribute('tabindex', '0');
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Skip Links
  addSkipLinks() {
    const skipLinks = [
      { href: '#main-content', text: 'Skip to main content' },
      { href: '#sidebar', text: 'Skip to navigation' },
      { href: '#page-settings', text: 'Skip to settings' }
    ];

    const skipLinksContainer = document.createElement('div');
    skipLinksContainer.className = 'skip-links';
    skipLinksContainer.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      z-index: 1000;
      transition: top 0.3s;
    `;

    skipLinks.forEach(link => {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.text;
      a.style.cssText = `
        display: inline-block;
        padding: 8px;
        background: var(--accent-purple, #7c5cff);
        color: white;
        text-decoration: none;
        border-radius: 4px;
        margin-right: 8px;
      `;
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

  // High Contrast and Reduced Motion Support
  setupHighContrastDetection() {
    const highContrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
    const forcedColorsMediaQuery = window.matchMedia('(forced-colors: active)');

    const updateHighContrast = () => {
      this.highContrastMode = highContrastMediaQuery.matches || forcedColorsMediaQuery.matches;
      document.body.classList.toggle('high-contrast', this.highContrastMode);

      if (this.highContrastMode) {
        this.enhanceHighContrast();
      }
    };

    highContrastMediaQuery.addEventListener('change', updateHighContrast);
    forcedColorsMediaQuery.addEventListener('change', updateHighContrast);
    updateHighContrast();
  }

  setupReducedMotionDetection() {
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateReducedMotion = () => {
      this.reducedMotion = reducedMotionMediaQuery.matches;
      document.body.classList.toggle('reduced-motion', this.reducedMotion);

      if (this.reducedMotion) {
        this.disableAnimations();
      }
    };

    reducedMotionMediaQuery.addEventListener('change', updateReducedMotion);
    updateReducedMotion();
  }

  enhanceHighContrast() {
    // Add high contrast enhancements
    const style = document.createElement('style');
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
    // Disable CSS animations and transitions
    const style = document.createElement('style');
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

  // General Accessibility Attributes
  addAccessibilityAttributes() {
    // Add ARIA attributes to improve accessibility
    document.querySelectorAll('.modal').forEach(modal => {
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
    });

    document.querySelectorAll('.nav-item').forEach(item => {
      item.setAttribute('role', 'button');
      item.setAttribute('aria-current', item.classList.contains('active') ? 'page' : 'false');
    });

    document.querySelectorAll('.settings-nav-item').forEach(item => {
      item.setAttribute('aria-current', item.classList.contains('active') ? 'page' : 'false');
    });

    // Progress indicators
    document.querySelectorAll('.progress-bar').forEach(progress => {
      progress.setAttribute('role', 'progressbar');
      progress.setAttribute('aria-valuemin', '0');
      progress.setAttribute('aria-valuemax', '100');
      progress.setAttribute('aria-valuenow', '0');
    });

    // Status messages
    document.querySelectorAll('.stat-card').forEach(card => {
      card.setAttribute('role', 'region');
      card.setAttribute('aria-labelledby', card.querySelector('.stat-label')?.id || '');
    });
  }

  // Public API
  announce(message, priority = 'polite') {
    this.announceToScreenReader(message, 'transcription-live-region', priority);
  }

  setFocus(element) {
    if (element && element.focus) {
      element.focus();
      if (this.screenReaderMode) {
        this.announceToScreenReader(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`);
      }
    }
  }

  // Integration with main app
  onTranscription(text) {
    this.announceToScreenReader(`Transcribed: ${text}`, 'transcription-live-region', 'polite');
  }

  onRecordingStart() {
    this.announceToScreenReader('Recording started', 'recording-live-region', 'assertive');
  }

  onRecordingStop() {
    this.announceToScreenReader('Recording stopped', 'recording-live-region', 'assertive');
  }

  onError(error) {
    this.announceToScreenReader(`Error: ${error}`, 'error-live-region', 'assertive');
  }

  onProgress(percent, message) {
    this.announceToScreenReader(`${message} ${percent}% complete`, 'progress-live-region', 'polite');
  }

  // Cleanup
  destroy() {
    // Remove event listeners and observers
    document.body.classList.remove('screen-reader-active', 'high-contrast', 'reduced-motion');
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

// Global error handler integration
window.addEventListener('error', (event) => {
  const accessibility = getAccessibilityManager();
  accessibility.onError(event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  const accessibility = getAccessibilityManager();
  accessibility.onError(event.reason?.message || 'Unhandled promise rejection');
});

// Make available globally
window.AccessibilityManager = AccessibilityManager;
window.getAccessibilityManager = getAccessibilityManager;

module.exports = { AccessibilityManager, getAccessibilityManager };