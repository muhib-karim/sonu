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
    onHistoryAppend: () => {},
    copyToClipboard: () => {},
    onShowMessage: () => {},
    onFocusHoldHotkey: () => {},
    onFocusToggleHotkey: () => {},
    onTranscriptionPartial: () => {}
  };

  // State
  let isListening = false;
  let currentPage = 'home';
  let currentSettingsPage = 'general';
  let editingHistoryItem = null;
  let stats = {
    streak: 0,
    words: 0,
    wpm: 0
  };

  // Elements
  const navItems = document.querySelectorAll('.nav-item[data-page]');
  const pages = document.querySelectorAll('.page');
  const settingsNavItems = document.querySelectorAll('.settings-nav-item[data-settings-page]');
  const settingsPages = document.querySelectorAll('.settings-page');
  const historyList = document.getElementById('history-list');
  const livePreview = document.getElementById('live-preview');
  const livePreviewText = document.getElementById('live-preview-text');
  const statStreak = document.getElementById('stat-streak');
  const statWords = document.getElementById('stat-words');
  const statWpm = document.getElementById('stat-wpm');

  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateToPage(page);
    });
  });

  function navigateToPage(page) {
    currentPage = page;
    
    // Update nav items
    navItems.forEach(nav => {
      nav.classList.toggle('active', nav.dataset.page === page);
    });
    
    // Update pages
    pages.forEach(p => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });
  }

  // Settings Navigation
  settingsNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.settingsPage;
      navigateToSettingsPage(page);
    });
  });

  function navigateToSettingsPage(page) {
    currentSettingsPage = page;
    
    // Update nav items
    settingsNavItems.forEach(nav => {
      nav.classList.toggle('active', nav.dataset.settingsPage === page);
    });
    
    // Update pages
    settingsPages.forEach(p => {
      p.classList.toggle('active', p.id === `settings-${page}`);
    });
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

  // Save language
  document.getElementById('save-language-btn')?.addEventListener('click', () => {
    const selected = document.getElementById('language-select').value;
    const langNames = { en: 'English', es: 'Spanish', fr: 'French', de: 'German' };
    document.getElementById('language-desc').textContent = langNames[selected] || 'English';
    closeModal('language-modal');
    showMessage('Language settings saved');
  });

  // Recording handlers
  ipc.onRecordingStart(() => {
      isListening = true;
    livePreview.style.display = 'block';
    livePreviewText.textContent = 'Listening...';
  });

  ipc.onRecordingStop(() => {
      isListening = false;
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
    
    // Create history item element
    const item = createHistoryItem(entry);
    historyList.insertBefore(item, historyList.firstChild);
    
    // Update stats
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    stats.words += wordCount;
    updateStatsDisplay();
  }

  function createHistoryItem(entry) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.timestamp = entry.timestamp;
    
    item.innerHTML = `
      <div class="history-time">${entry.time}</div>
      <div class="history-text" contenteditable="false">${escapeHtml(entry.text)}</div>
      <div class="history-actions">
        <button class="history-action-btn edit-btn">Edit</button>
        <button class="history-action-btn copy-btn">Copy</button>
      </div>
    `;
    
    // Edit functionality
    const editBtn = item.querySelector('.edit-btn');
    const copyBtn = item.querySelector('.copy-btn');
    const textEl = item.querySelector('.history-text');
    
    editBtn.addEventListener('click', () => {
      if (editingHistoryItem) {
        cancelEdit(editingHistoryItem);
      }
      
      item.classList.add('editing');
      textEl.contentEditable = 'true';
      textEl.classList.add('editable');
      textEl.focus();
      
      // Replace edit button with save/cancel
      editBtn.textContent = 'Save';
      editBtn.classList.add('save');
      editBtn.onclick = () => saveEdit(item, textEl);
      
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'history-action-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.onclick = () => cancelEdit(item);
      editBtn.parentNode.insertBefore(cancelBtn, editBtn.nextSibling);
      
      editingHistoryItem = item;
    });
    
    copyBtn.addEventListener('click', () => {
      ipc.copyToClipboard(entry.text);
      showMessage('Copied to clipboard');
    });
    
    return item;
  }

  function saveEdit(item, textEl) {
    const newText = textEl.textContent.trim();
    if (newText) {
      textEl.textContent = newText;
      textEl.contentEditable = 'false';
      textEl.classList.remove('editable');
      item.classList.remove('editing');
      
      // Restore edit button
      const saveBtn = item.querySelector('.save');
      saveBtn.textContent = 'Edit';
      saveBtn.classList.remove('save');
      saveBtn.onclick = () => {
        item.classList.add('editing');
        textEl.contentEditable = 'true';
        textEl.classList.add('editable');
        textEl.focus();
      };
      
      // Remove cancel button
      const cancelBtn = item.querySelector('.history-action-btn:not(.edit-btn):not(.copy-btn)');
      if (cancelBtn) cancelBtn.remove();
      
      editingHistoryItem = null;
      showMessage('Changes saved');
    }
  }

  function cancelEdit(item) {
    const textEl = item.querySelector('.history-text');
    const originalText = textEl.dataset.originalText || textEl.textContent;
    
    textEl.textContent = originalText;
    textEl.contentEditable = 'false';
    textEl.classList.remove('editable');
    item.classList.remove('editing');
    
    // Restore edit button
    const saveBtn = item.querySelector('.save');
    if (saveBtn) {
      saveBtn.textContent = 'Edit';
      saveBtn.classList.remove('save');
    }
    
    // Remove cancel button
    const cancelBtn = item.querySelector('.history-action-btn:not(.edit-btn):not(.copy-btn)');
    if (cancelBtn) cancelBtn.remove();
    
    editingHistoryItem = null;
  }

  // Load history
  ipc.getHistory().then((items) => {
    items.reverse().forEach(entry => {
      const timeStr = formatTime(new Date(entry.ts));
      const historyEntry = { text: entry.text, time: timeStr, timestamp: entry.ts };
      const item = createHistoryItem(historyEntry);
      historyList.appendChild(item);
      
      // Update stats
      const wordCount = entry.text.split(/\s+/).filter(w => w.length > 0).length;
      stats.words += wordCount;
    });
    updateStatsDisplay();
  });

  // Stats
  function updateStats(text) {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    stats.words += wordCount;
    
    // Calculate WPM (rough estimate)
    const avgWordLength = 5;
    const charsPerMinute = (text.length / 1) * 60; // Assuming 1 second for now
    stats.wpm = Math.round(charsPerMinute / avgWordLength);
    
    updateStatsDisplay();
  }

  function updateStatsDisplay() {
    if (statStreak) statStreak.textContent = `${stats.streak} days`;
    if (statWords) statWords.textContent = `${formatNumber(stats.words)} words`;
    if (statWpm) statWpm.textContent = `${stats.wpm} WPM`;
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
    // Simple message display - can be enhanced with toast notifications
    console.log(msg);
  }

  // Edit hotkeys button - navigate to settings and open shortcuts modal
  document.getElementById('edit-hotkeys-btn')?.addEventListener('click', () => {
    navigateToPage('settings');
    navigateToSettingsPage('general');
    setTimeout(() => {
      document.getElementById('change-shortcuts-btn')?.click();
    }, 100);
  });
  
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

  // Window controls
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');

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
  
  // Apply theme with smooth transitions using View Transitions API
  function applyTheme(theme) {
    const root = document.documentElement;
    const appContainer = document.querySelector('.app-container');
    const mainContent = document.querySelector('.main-content');
    const body = document.body;
    
    // Use View Transitions API if available for smoother transitions
    const applyThemeChange = () => {
      // Set data attribute for theme-specific styling
      body.setAttribute('data-theme', theme);
      
      // Use double requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (theme === 'dark') {
            // Dim theme - softer, warmer dark colors
            root.style.setProperty('--bg-primary', '#1a1a1f');
            root.style.setProperty('--bg-secondary', '#242429');
            root.style.setProperty('--bg-sidebar', '#1f1f24');
            root.style.setProperty('--bg-card', '#2a2a2f');
            root.style.setProperty('--bg-hover', '#2f2f34');
            root.style.setProperty('--text-primary', '#e8e8ed');
            root.style.setProperty('--text-secondary', '#b0b0b5');
            root.style.setProperty('--text-muted', '#808085');
            root.style.setProperty('--border-color', 'rgba(255, 255, 255, 0.08)');
            root.style.setProperty('--glass-bg', 'rgba(31, 31, 36, 0.85)');
            root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.08)');
            // Dictation box dark theme colors
            root.style.setProperty('--dictation-bg', 'linear-gradient(135deg, #2a2a2f 0%, #242429 100%)');
            root.style.setProperty('--dictation-title', '#e8e8ed');
            root.style.setProperty('--dictation-title-strong', '#ffffff');
            root.style.setProperty('--dictation-desc', '#b0b0b5');
            root.style.setProperty('--dictation-btn-bg', '#3a3a3f');
            root.style.setProperty('--dictation-btn-hover', '#4a4a4f');
            root.style.setProperty('--dictation-border', 'rgba(255, 255, 255, 0.08)');
            if (appContainer) {
              appContainer.style.background = 'linear-gradient(135deg, #1f1f24 0%, #1a1a1f 50%, #1f1f24 100%)';
            }
            if (mainContent) {
              mainContent.style.background = 'linear-gradient(135deg, #1f1f24 0%, #1a1a1f 50%, #1f1f24 100%)';
            }
            document.body.style.background = 'linear-gradient(135deg, #1f1f24 0%, #1a1a1f 50%, #1f1f24 100%)';
          } else {
            root.style.setProperty('--bg-primary', '#f5f5f7');
            root.style.setProperty('--bg-secondary', '#ffffff');
            root.style.setProperty('--bg-sidebar', 'rgba(255, 255, 255, 0.8)');
            root.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.9)');
            root.style.setProperty('--bg-hover', 'rgba(0, 0, 0, 0.05)');
            root.style.setProperty('--text-primary', '#1d1d1f');
            root.style.setProperty('--text-secondary', '#6e6e73');
            root.style.setProperty('--text-muted', '#86868b');
            root.style.setProperty('--border-color', 'rgba(0, 0, 0, 0.1)');
            root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.7)');
            root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.18)');
            // Dictation box light theme colors
            root.style.setProperty('--dictation-bg', 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)');
            root.style.setProperty('--dictation-title', '#1f2937');
            root.style.setProperty('--dictation-title-strong', '#111827');
            root.style.setProperty('--dictation-desc', '#4b5563');
            root.style.setProperty('--dictation-btn-bg', '#374151');
            root.style.setProperty('--dictation-btn-hover', '#4b5563');
            root.style.setProperty('--dictation-border', 'rgba(255, 255, 255, 0.5)');
            if (appContainer) {
              appContainer.style.background = 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 50%, #f5f5f7 100%)';
            }
            if (mainContent) {
              mainContent.style.background = 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 50%, #f5f5f7 100%)';
            }
            document.body.style.background = 'linear-gradient(135deg, #f5f5f7 0%, #ffffff 50%, #f5f5f7 100%)';
          }
        });
      });
    };
    
    // Use View Transitions API if available
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        applyThemeChange();
      });
    } else {
      // Fallback for browsers/Electron without View Transitions API
      requestAnimationFrame(() => {
        applyThemeChange();
      });
    }
  }
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      currentTheme = newTheme;
      localStorage.setItem('sonu-theme', newTheme);
      themeToggleBtn.setAttribute('data-theme', newTheme);
      applyTheme(newTheme);
    });
  }
  
  // Initialize
  loadTheme();
  updateStatsDisplay();
  updateDictationBoxHotkey();
  
  // Update dictation box when settings change
  ipc.onHotkeyRegistered(() => {
    updateDictationBoxHotkey();
  });
})();
