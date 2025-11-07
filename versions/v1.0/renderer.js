(() => {
  const statusEl = document.getElementById('status');
  const outputEl = document.getElementById('output');
  const toggleBtn = document.getElementById('toggle-btn');
  const hotkeyHold = document.getElementById('hotkey-hold');
  const hotkeyToggle = document.getElementById('hotkey-toggle');
  const saveBtn = document.getElementById('save-settings');
  const indicator = document.getElementById('listening-indicator');

  function setStatus(text, active = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle('active', active);
  }

  const ipc = window.voiceApp || {
    onTranscription: () => {},
    onRecordingStart: () => {},
    onRecordingStop: () => {},
    toggleRecording: () => {},
    getSettings: async () => ({ hotkey: 'CommandOrControl+Shift+Space', mode: 'toggle' }),
    saveSettings: async (s) => s,
    onHotkeyRegistered: () => {},
    onHotkeyError: () => {},
    startCaptureHotkey: () => {},
    endCaptureHotkey: () => {},
    getHistory: async () => [],
    clearHistory: async () => [],
    onHistoryAppend: () => {},
    copyToClipboard: () => {}
  };

  let isListening = false;
  let liveItemEl = null;
  let liveTextEl = null;
  ipc.onRecordingStart(() => {
    setStatus('Listening… Press Ctrl+Shift+Space to stop', true);
    if (!isListening) {
      isListening = true;
      playSwitch();
    }
  });

  ipc.onRecordingStop(() => {
    setStatus('Processing…', false);
    if (isListening) {
      isListening = false;
      playSwitch();
    }
  });

  ipc.onTranscription((text) => {
    if (!text) return;
    if (liveItemEl) {
      try { liveItemEl.remove(); } catch (e) {}
      liveItemEl = null;
      liveTextEl = null;
    }
    renderOutputItem({ text });
    setStatus('Ready.', false);
  });

  if (ipc.onTranscriptionPartial) {
    ipc.onTranscriptionPartial((text) => {
      if (!text) return;
      ensureLiveItem();
      if (liveTextEl) liveTextEl.textContent = text;
    });
  }

  toggleBtn.addEventListener('click', () => {
    ipc.toggleRecording();
  });

  ipc.getSettings().then((s) => {
    hotkeyHold.value = s.holdHotkey || 'CommandOrControl+Super+Space';
    hotkeyToggle.value = s.toggleHotkey || 'CommandOrControl+Shift+Space';
    setStatus(`Ready. Hold: ${hotkeyHold.value} | Toggle: ${hotkeyToggle.value}`, false);
  });

  ipc.getHistory().then((items) => {
    items.reverse().forEach((entry) => renderOutputItem(entry));
  });

  saveBtn.addEventListener('click', async () => {
    const s = await ipc.saveSettings({ holdHotkey: hotkeyHold.value.trim(), toggleHotkey: hotkeyToggle.value.trim() });
    setStatus(`Saved. Hold: ${s.holdHotkey} | Toggle: ${s.toggleHotkey}`, false);
  });

  ipc.onHotkeyRegistered((acc) => {
    setStatus(`Hotkey registered: ${acc}`, false);
  });
  ipc.onHotkeyError((acc) => {
    setStatus(`Hotkey failed to register: ${acc}. Try a different combo.`, false);
  });

  function renderOutputItem(entry) {
    const div = document.createElement('div');
    div.className = 'output-item';
    const txt = document.createElement('div');
    txt.className = 'output-text';
    txt.textContent = entry.text || entry;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copy';
    btn.addEventListener('click', () => {
      const val = entry.text || entry;
      let ok = false;
      try { ipc.copyToClipboard(val); ok = true; } catch (e) {}
      if (!ok && navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(() => setStatus('Copied to clipboard', false)).catch(() => setStatus('Copy failed', false));
      } else {
        setStatus('Copied to clipboard', false);
      }
    });
    div.appendChild(txt);
    div.appendChild(btn);
    outputEl.prepend(div);
  }

  function ensureLiveItem() {
    if (liveItemEl) return;
    const div = document.createElement('div');
    div.className = 'output-item live';
    const txt = document.createElement('div');
    txt.className = 'output-text';
    txt.textContent = '';
    liveItemEl = div;
    liveTextEl = txt;
    div.appendChild(txt);
    outputEl.prepend(div);
  }

  let capturing = false;
  function mapKey(e) {
    const k = e.key;
    if (k === ' ') return 'Space';
    if (k.length === 1) return k.toUpperCase();
    const specials = {
      Escape: 'Esc',
      Backspace: 'Backspace',
      Tab: 'Tab',
      Enter: 'Enter'
    };
    return specials[k] || k;
  }

  function attachCapture(input, label) {
    input.addEventListener('focus', () => {
      capturing = true;
      ipc.startCaptureHotkey();
      setStatus(`Press ${label} shortcut, then Enter to confirm`, false);
      input.select();
    });
    input.addEventListener('blur', () => {
      capturing = false;
      ipc.endCaptureHotkey();
      setStatus('Ready.', false);
    });
    input.addEventListener('keydown', (e) => {
      if (!capturing) return;
      e.preventDefault();
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey) parts.push('Win');
      const mainKey = mapKey(e);
      if (mainKey && mainKey !== 'Enter') parts.push(mainKey);
      input.value = parts.join('+');
      if (e.key === 'Enter') input.blur();
    });
  }

  attachCapture(hotkeyHold, 'Hold');
  attachCapture(hotkeyToggle, 'Toggle');

  let audioCtx;
  function getCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    return audioCtx;
  }
  function beep(freq = 880, duration = 120, type = 'sine') {
    const ctx = getCtx();
    if (!ctx) return;
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
    setTimeout(() => { try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch (e) {} }, duration + 20);
  }
  function playBeepStart() { beep(880, 140, 'sine'); }
  function playBeepStop() { beep(440, 160, 'sine'); }
  function playSwitch() {
    const ctx = getCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch (e) {} }, 260);
  }

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
})();
