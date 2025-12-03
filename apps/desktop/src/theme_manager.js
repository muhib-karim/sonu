/**
 * Theme Management System for SONU
 * Provides theme customization, creation, and management
 */

class ThemeManager {
  constructor() {
    this.currentTheme = 'dark';
    this.themes = new Map();
    this.customThemes = [];
    this.cssVariables = [];
    this.isInitialized = false;

    this.initialize();
  }

  initialize() {
    if (this.isInitialized) return;

    this.registerBuiltInThemes();
    this.loadCustomThemes();
    this.detectSystemTheme();
    this.applyTheme(this.loadSavedTheme());
    this.setupSystemThemeListener();
    
    this.isInitialized = true;
    console.log('Theme manager initialized');
  }

  registerBuiltInThemes() {
    // Dark theme (default)
    this.register({
      id: 'dark',
      name: 'Dark',
      description: 'Default dark theme',
      colors: {
        '--bg-primary': '#1a1a2e',
        '--bg-secondary': '#16213e',
        '--bg-tertiary': '#0f3460',
        '--bg-card': 'rgba(255, 255, 255, 0.05)',
        '--text-primary': '#ffffff',
        '--text-secondary': 'rgba(255, 255, 255, 0.7)',
        '--text-muted': 'rgba(255, 255, 255, 0.5)',
        '--accent-purple': '#7c5cff',
        '--accent-purple-hover': '#6a4fd9',
        '--accent-green': '#00d084',
        '--accent-red': '#ff6b6b',
        '--border-color': 'rgba(255, 255, 255, 0.1)',
        '--shadow-color': 'rgba(0, 0, 0, 0.3)',
        '--scrollbar-bg': 'rgba(255, 255, 255, 0.05)',
        '--scrollbar-thumb': 'rgba(255, 255, 255, 0.2)'
      }
    });

    // Light theme
    this.register({
      id: 'light',
      name: 'Light',
      description: 'Clean light theme',
      colors: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f5f5f7',
        '--bg-tertiary': '#e8e8ed',
        '--bg-card': 'rgba(0, 0, 0, 0.03)',
        '--text-primary': '#1d1d1f',
        '--text-secondary': 'rgba(0, 0, 0, 0.65)',
        '--text-muted': 'rgba(0, 0, 0, 0.45)',
        '--accent-purple': '#7c5cff',
        '--accent-purple-hover': '#6a4fd9',
        '--accent-green': '#00a86b',
        '--accent-red': '#ff3b30',
        '--border-color': 'rgba(0, 0, 0, 0.1)',
        '--shadow-color': 'rgba(0, 0, 0, 0.1)',
        '--scrollbar-bg': 'rgba(0, 0, 0, 0.05)',
        '--scrollbar-thumb': 'rgba(0, 0, 0, 0.2)'
      }
    });

    // Ocean theme
    this.register({
      id: 'ocean',
      name: 'Ocean',
      description: 'Deep ocean blue theme',
      colors: {
        '--bg-primary': '#0a192f',
        '--bg-secondary': '#112240',
        '--bg-tertiary': '#1d3557',
        '--bg-card': 'rgba(100, 255, 218, 0.05)',
        '--text-primary': '#ccd6f6',
        '--text-secondary': '#8892b0',
        '--text-muted': '#495670',
        '--accent-purple': '#64ffda',
        '--accent-purple-hover': '#4fd1b0',
        '--accent-green': '#64ffda',
        '--accent-red': '#ff6b6b',
        '--border-color': 'rgba(100, 255, 218, 0.1)',
        '--shadow-color': 'rgba(0, 0, 0, 0.4)',
        '--scrollbar-bg': 'rgba(100, 255, 218, 0.05)',
        '--scrollbar-thumb': 'rgba(100, 255, 218, 0.2)'
      }
    });

    // Forest theme
    this.register({
      id: 'forest',
      name: 'Forest',
      description: 'Natural forest green theme',
      colors: {
        '--bg-primary': '#1a2f1a',
        '--bg-secondary': '#223322',
        '--bg-tertiary': '#2d4a2d',
        '--bg-card': 'rgba(144, 238, 144, 0.05)',
        '--text-primary': '#e8f5e9',
        '--text-secondary': 'rgba(232, 245, 233, 0.7)',
        '--text-muted': 'rgba(232, 245, 233, 0.5)',
        '--accent-purple': '#81c784',
        '--accent-purple-hover': '#66bb6a',
        '--accent-green': '#81c784',
        '--accent-red': '#ef5350',
        '--border-color': 'rgba(144, 238, 144, 0.15)',
        '--shadow-color': 'rgba(0, 0, 0, 0.35)',
        '--scrollbar-bg': 'rgba(144, 238, 144, 0.05)',
        '--scrollbar-thumb': 'rgba(144, 238, 144, 0.2)'
      }
    });

    // Sunset theme
    this.register({
      id: 'sunset',
      name: 'Sunset',
      description: 'Warm sunset orange theme',
      colors: {
        '--bg-primary': '#2d1b2d',
        '--bg-secondary': '#3d2342',
        '--bg-tertiary': '#4a2c54',
        '--bg-card': 'rgba(255, 167, 38, 0.05)',
        '--text-primary': '#fff5eb',
        '--text-secondary': 'rgba(255, 245, 235, 0.7)',
        '--text-muted': 'rgba(255, 245, 235, 0.5)',
        '--accent-purple': '#ffa726',
        '--accent-purple-hover': '#fb8c00',
        '--accent-green': '#66bb6a',
        '--accent-red': '#ef5350',
        '--border-color': 'rgba(255, 167, 38, 0.15)',
        '--shadow-color': 'rgba(0, 0, 0, 0.35)',
        '--scrollbar-bg': 'rgba(255, 167, 38, 0.05)',
        '--scrollbar-thumb': 'rgba(255, 167, 38, 0.2)'
      }
    });

    // Midnight theme
    this.register({
      id: 'midnight',
      name: 'Midnight',
      description: 'Pure dark AMOLED theme',
      colors: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#0a0a0a',
        '--bg-tertiary': '#141414',
        '--bg-card': 'rgba(255, 255, 255, 0.03)',
        '--text-primary': '#ffffff',
        '--text-secondary': 'rgba(255, 255, 255, 0.65)',
        '--text-muted': 'rgba(255, 255, 255, 0.4)',
        '--accent-purple': '#bb86fc',
        '--accent-purple-hover': '#9f6ce7',
        '--accent-green': '#03dac6',
        '--accent-red': '#cf6679',
        '--border-color': 'rgba(255, 255, 255, 0.08)',
        '--shadow-color': 'rgba(0, 0, 0, 0.5)',
        '--scrollbar-bg': 'rgba(255, 255, 255, 0.03)',
        '--scrollbar-thumb': 'rgba(255, 255, 255, 0.15)'
      }
    });

    // Lavender theme
    this.register({
      id: 'lavender',
      name: 'Lavender',
      description: 'Soft purple lavender theme',
      colors: {
        '--bg-primary': '#f5f0ff',
        '--bg-secondary': '#ebe5f5',
        '--bg-tertiary': '#ddd6eb',
        '--bg-card': 'rgba(124, 92, 255, 0.05)',
        '--text-primary': '#2d2640',
        '--text-secondary': 'rgba(45, 38, 64, 0.7)',
        '--text-muted': 'rgba(45, 38, 64, 0.5)',
        '--accent-purple': '#7c5cff',
        '--accent-purple-hover': '#6a4fd9',
        '--accent-green': '#00b894',
        '--accent-red': '#d63031',
        '--border-color': 'rgba(124, 92, 255, 0.15)',
        '--shadow-color': 'rgba(124, 92, 255, 0.1)',
        '--scrollbar-bg': 'rgba(124, 92, 255, 0.05)',
        '--scrollbar-thumb': 'rgba(124, 92, 255, 0.2)'
      }
    });
  }

  register(theme) {
    if (!theme.id || !theme.name || !theme.colors) {
      console.error('Invalid theme:', theme);
      return false;
    }

    this.themes.set(theme.id, theme);
    return true;
  }

  // Create custom theme
  createCustomTheme(name, baseTheme, customColors) {
    const base = this.themes.get(baseTheme) || this.themes.get('dark');
    const customTheme = {
      id: `custom_${Date.now()}`,
      name: name,
      description: `Custom theme based on ${base.name}`,
      isCustom: true,
      baseTheme: baseTheme,
      colors: { ...base.colors, ...customColors }
    };

    this.register(customTheme);
    this.customThemes.push(customTheme.id);
    this.saveCustomThemes();

    return customTheme.id;
  }

  // Delete custom theme
  deleteCustomTheme(themeId) {
    if (!themeId.startsWith('custom_')) {
      console.warn('Cannot delete built-in theme');
      return false;
    }

    this.themes.delete(themeId);
    this.customThemes = this.customThemes.filter(id => id !== themeId);
    this.saveCustomThemes();

    if (this.currentTheme === themeId) {
      this.applyTheme('dark');
    }

    return true;
  }

  // Apply theme
  applyTheme(themeId) {
    if (typeof document === 'undefined') return false;

    const theme = this.themes.get(themeId);
    if (!theme) {
      console.warn(`Theme not found: ${themeId}`);
      return false;
    }

    // Apply CSS variables
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([variable, value]) => {
      root.style.setProperty(variable, value);
    });

    // Update body class
    document.body.classList.remove('theme-dark', 'theme-light');
    const isLight = this.isLightTheme(theme);
    document.body.classList.add(isLight ? 'theme-light' : 'theme-dark');
    document.body.setAttribute('data-theme', themeId);

    this.currentTheme = themeId;
    this.saveTheme(themeId);

    // Dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { themeId, theme, isLight }
      }));
    }

    console.log(`Applied theme: ${theme.name}`);
    return true;
  }

  isLightTheme(theme) {
    const bgPrimary = theme.colors['--bg-primary'];
    if (!bgPrimary) return false;

    // Parse hex color and check luminance
    const hex = bgPrimary.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5;
    }
    return false;
  }

  // Toggle between light and dark
  toggle() {
    const current = this.themes.get(this.currentTheme);
    const isLight = this.isLightTheme(current);
    this.applyTheme(isLight ? 'dark' : 'light');
  }

  // Get available themes
  getThemes() {
    return Array.from(this.themes.values());
  }

  getBuiltInThemes() {
    return this.getThemes().filter(t => !t.isCustom);
  }

  getCustomThemes() {
    return this.getThemes().filter(t => t.isCustom);
  }

  getTheme(themeId) {
    return this.themes.get(themeId);
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  // System theme detection
  detectSystemTheme() {
    if (typeof window === 'undefined') return 'dark';
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  setupSystemThemeListener() {
    if (typeof window === 'undefined') return;

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const savedTheme = this.loadSavedTheme();
      // Only auto-switch if user hasn't explicitly chosen a theme
      if (savedTheme === 'system' || !savedTheme) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // Persistence
  saveTheme(themeId) {
    try {
      localStorage.setItem('sonu-theme', themeId);
    } catch (e) {}
  }

  loadSavedTheme() {
    try {
      return localStorage.getItem('sonu-theme') || 'dark';
    } catch (e) {
      return 'dark';
    }
  }

  saveCustomThemes() {
    try {
      const customThemesData = this.customThemes.map(id => {
        const theme = this.themes.get(id);
        return theme ? { ...theme } : null;
      }).filter(Boolean);

      localStorage.setItem('sonu-custom-themes', JSON.stringify(customThemesData));
    } catch (e) {}
  }

  loadCustomThemes() {
    try {
      const saved = localStorage.getItem('sonu-custom-themes');
      if (saved) {
        const customThemesData = JSON.parse(saved);
        customThemesData.forEach(theme => {
          this.register(theme);
          this.customThemes.push(theme.id);
        });
      }
    } catch (e) {}
  }

  // CSS variables extraction for theme editor
  getCSSVariables() {
    if (typeof document === 'undefined') return [];
    
    const styles = getComputedStyle(document.documentElement);
    const variables = [];
    
    const variableNames = [
      '--bg-primary', '--bg-secondary', '--bg-tertiary', '--bg-card',
      '--text-primary', '--text-secondary', '--text-muted',
      '--accent-purple', '--accent-purple-hover', '--accent-green', '--accent-red',
      '--border-color', '--shadow-color', '--scrollbar-bg', '--scrollbar-thumb'
    ];

    variableNames.forEach(name => {
      variables.push({
        name,
        value: styles.getPropertyValue(name).trim(),
        description: this.getVariableDescription(name)
      });
    });

    return variables;
  }

  getVariableDescription(name) {
    const descriptions = {
      '--bg-primary': 'Main background color',
      '--bg-secondary': 'Secondary background color',
      '--bg-tertiary': 'Tertiary background color',
      '--bg-card': 'Card background color',
      '--text-primary': 'Primary text color',
      '--text-secondary': 'Secondary text color',
      '--text-muted': 'Muted text color',
      '--accent-purple': 'Primary accent color',
      '--accent-purple-hover': 'Accent hover color',
      '--accent-green': 'Success/positive color',
      '--accent-red': 'Error/danger color',
      '--border-color': 'Border color',
      '--shadow-color': 'Shadow color',
      '--scrollbar-bg': 'Scrollbar background',
      '--scrollbar-thumb': 'Scrollbar thumb color'
    };
    return descriptions[name] || name;
  }

  // Export theme
  exportTheme(themeId) {
    const theme = this.themes.get(themeId);
    if (!theme) return null;

    return JSON.stringify(theme, null, 2);
  }

  // Import theme
  importTheme(themeJson) {
    try {
      const theme = JSON.parse(themeJson);
      if (!theme.id || !theme.name || !theme.colors) {
        throw new Error('Invalid theme format');
      }

      theme.id = `imported_${Date.now()}`;
      theme.isCustom = true;

      this.register(theme);
      this.customThemes.push(theme.id);
      this.saveCustomThemes();

      return theme.id;
    } catch (e) {
      console.error('Failed to import theme:', e);
      return null;
    }
  }

  destroy() {
    this.themes.clear();
    this.customThemes = [];
    console.log('Theme manager destroyed');
  }
}

// Singleton instance
let themeManagerInstance = null;

function getThemeManager() {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager();
  }
  return themeManagerInstance;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
  window.getThemeManager = getThemeManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager, getThemeManager };
}
