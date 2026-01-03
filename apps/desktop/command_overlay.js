// Renderer for Command Overlay
const { ipcRenderer } = require('electron');

const input = document.getElementById('command-input');
const previewArea = document.getElementById('preview-area');
const previewContent = document.getElementById('preview-content');
const btnApply = document.getElementById('btn-apply');
const btnCancel = document.getElementById('btn-cancel');
const statusBar = document.getElementById('status-bar');
const micIcon = document.getElementById('mic-icon');

let currentText = '';
let isProcessing = false;

// Focus input on load
window.onload = () => {
    input.focus();
};

// Handle Esc key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        ipcRenderer.send('command:close');
    }
});

// Handle Enter key
input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!input.value.trim()) return;
        
        if (previewArea.classList.contains('hidden')) {
            // Generate
            processCommand(input.value);
        } else {
            // Apply
            applyResult();
        }
    }
});

btnApply.addEventListener('click', applyResult);
btnCancel.addEventListener('click', () => ipcRenderer.send('command:close'));

async function processCommand(command) {
    if (isProcessing) return;
    isProcessing = true;
    
    setLoading(true);
    
    try {
        // Get selected text from main app context
        const result = await ipcRenderer.invoke('command:process', {
            command: command,
            context: 'selection' // Or 'last-transcript'
        });
        
        if (result.success) {
            showPreview(result.text);
            statusBar.innerText = 'Press Enter to apply';
        } else {
            statusBar.innerText = 'Error: ' + result.error;
        }
    } catch (err) {
        statusBar.innerText = 'Error: ' + err.message;
    } finally {
        setLoading(false);
        isProcessing = false;
    }
}

function showPreview(text) {
    currentText = text;
    previewContent.innerText = text;
    previewArea.classList.remove('hidden');
}

function applyResult() {
    ipcRenderer.send('command:apply', currentText);
    ipcRenderer.send('command:close');
}

function setLoading(loading) {
    if (loading) {
        statusBar.innerText = 'Processing...';
        input.disabled = true;
    } else {
        statusBar.innerText = 'Ready';
        input.disabled = false;
        input.focus();
    }
}

// Listen for events
ipcRenderer.on('reset', () => {
    input.value = '';
    previewArea.classList.add('hidden');
    previewContent.innerText = '';
    statusBar.innerText = 'Ready';
    input.disabled = false;
    input.focus();
});
