const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetApp', {
  stopRecording: () => ipcRenderer.send('widget-stop-recording'),
  cancelRecording: () => ipcRenderer.send('widget-cancel-recording')
});

// Listen for waveform start event to ensure waveform is visible immediately
ipcRenderer.on('start-waveform', () => {
  // Waveform is already in HTML and animates via CSS
  // Just ensure it's visible by checking the container
  const waveformContainer = document.querySelector('.waveform-container');
  if (waveformContainer) {
    waveformContainer.style.display = 'flex';
    waveformContainer.style.visibility = 'visible';
    // Force a repaint to ensure animation starts
    waveformContainer.offsetHeight; // Trigger reflow
  }
});


