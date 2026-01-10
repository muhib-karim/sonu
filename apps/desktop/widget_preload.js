const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetApp', {
  stopRecording: () => {
    console.log('[WIDGET-PRELOAD] stopRecording called, sending IPC');
    ipcRenderer.send('widget-stop-recording');
  },
  cancelRecording: () => {
    console.log('[WIDGET-PRELOAD] cancelRecording called, sending IPC');
    ipcRenderer.send('widget-cancel-recording');
  },
  hide: () => {
    console.log('[WIDGET-PRELOAD] hide called, sending IPC');
    ipcRenderer.send('widget-hide');
  }
});

// Web Audio API for sound playback
let audioContext = null;

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playBeep(freq, duration) {
  try {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    setTimeout(() => {
      try { osc.stop(); } catch (e) { }
    }, duration + 50);

    console.log('[WIDGET] Played beep:', freq, 'Hz');
  } catch (e) {
    console.error('[WIDGET] Sound error:', e);
  }
}

// Listen for sound events from main process
ipcRenderer.on('play-sound', (_, type) => {
  console.log('[WIDGET] Sound event received:', type);
  if (type === 'start') {
    playBeep(880, 150); // Higher pitch for start
  } else if (type === 'stop') {
    playBeep(440, 180); // Lower pitch for stop
  }
});

console.log('[WIDGET] Preload loaded with sound support');
