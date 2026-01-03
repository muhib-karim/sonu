#!/usr/bin/env python3
"""
SONU Web Demo - A simple web interface to demonstrate SONU's voice typing capabilities
"""

import os
import json
import threading
import time
from flask import Flask, render_template_string, request, jsonify
from whisper_service import WhisperService

app = Flask(__name__)

# Global whisper service
whisper_service = None
current_transcript = ""
transcript_lock = threading.Lock()

def init_whisper():
    global whisper_service
    try:
        whisper_service = WhisperService()
        return True
    except Exception as e:
        print(f"Failed to initialize Whisper service: {e}")
        return False

def transcription_callback(transcript):
    """Callback for new transcription results"""
    global current_transcript
    with transcript_lock:
        current_transcript = transcript
    print(f"New transcript: {transcript}")

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SONU Voice Typing Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #333;
        }
        
        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            width: 90%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        
        .logo {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        
        .title {
            font-size: 2.5rem;
            font-weight: 300;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 1.1rem;
            color: #7f8c8d;
            margin-bottom: 20px;
        }
        
        .status {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .status.ready {
            background: #d4edda;
            color: #155724;
        }
        
        .status.error {
            background: #f8d7da;
            color: #721c24;
        }
        
        .controls {
            display: flex;
            gap: 20px;
            margin-bottom: 40px;
            justify-content: center;
        }
        
        .btn {
            padding: 15px 30px;
            border: none;
            border-radius: 50px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 140px;
        }
        
        .btn-primary {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .btn-danger:hover {
            background: #c0392b;
            transform: translateY(-2px);
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        
        .transcription-area {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 30px;
            min-height: 200px;
            margin-bottom: 20px;
            font-size: 1.1rem;
            line-height: 1.6;
            color: #2c3e50;
        }
        
        .transcription-area.typing {
            border-color: #667eea;
            background: #f0f3ff;
        }
        
        .transcription-area.empty {
            color: #6c757d;
            font-style: italic;
        }
        
        .waveform {
            display: none;
            text-align: center;
            margin: 20px 0;
        }
        
        .waveform.active {
            display: block;
        }
        
        .wave-bar {
            display: inline-block;
            width: 4px;
            height: 20px;
            background: #667eea;
            margin: 0 1px;
            border-radius: 2px;
            animation: wave 1s ease-in-out infinite;
        }
        
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.3s; }
        .wave-bar:nth-child(5) { animation-delay: 0.4s; }
        
        @keyframes wave {
            0%, 100% { height: 20px; }
            50% { height: 40px; }
        }
        
        .features {
            margin-top: 40px;
            text-align: center;
        }
        
        .feature {
            display: inline-block;
            margin: 10px 15px;
            padding: 10px 20px;
            background: #e8f4f8;
            border-radius: 20px;
            font-size: 0.9rem;
            color: #2c3e50;
        }
        
        .info-panel {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 10px;
            padding: 20px;
            margin-top: 30px;
        }
        
        .info-panel h3 {
            color: #856404;
            margin-bottom: 10px;
        }
        
        .info-panel p {
            color: #856404;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎤</div>
            <h1 class="title">SONU</h1>
            <p class="subtitle">Professional Offline Voice Typing</p>
            <span class="status" id="status">Initializing...</span>
        </div>
        
        <div class="controls">
            <button class="btn btn-primary" id="startBtn" onclick="startRecording()">Start Dictation</button>
            <button class="btn btn-danger" id="stopBtn" onclick="stopRecording()" disabled>Stop & Output</button>
        </div>
        
        <div class="waveform" id="waveform">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
        </div>
        
        <div class="transcription-area empty" id="transcriptionArea">
            Your transcription will appear here...
        </div>
        
        <div class="features">
            <span class="feature">🎯 100% Offline</span>
            <span class="feature">⚡ Real-time</span>
            <span class="feature">🔒 Private</span>
            <span class="feature">🎵 Whisper AI</span>
        </div>
        
        <div class="info-panel">
            <h3>🚀 What is SONU?</h3>
            <p><strong>SONU</strong> is a professional-grade offline voice typing application powered by OpenAI's Whisper AI. 
            This demo shows the core transcription engine running in a web browser. The full desktop application 
            includes system-wide hotkeys, real-time typing, and advanced features for seamless dictation.</p>
        </div>
    </div>

    <script>
        let isRecording = false;
        let transcriptionUpdateInterval = null;
        
        async function checkStatus() {
            try {
                const response = await fetch('/status');
                const data = await response.json();
                const statusEl = document.getElementById('status');
                
                if (data.ready) {
                    statusEl.textContent = 'Ready';
                    statusEl.className = 'status ready';
                } else {
                    statusEl.textContent = 'Error';
                    statusEl.className = 'status error';
                }
            } catch (error) {
                console.error('Status check failed:', error);
            }
        }
        
        async function startRecording() {
            try {
                const response = await fetch('/start', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    isRecording = true;
                    document.getElementById('startBtn').disabled = true;
                    document.getElementById('stopBtn').disabled = false;
                    document.getElementById('waveform').classList.add('active');
                    document.getElementById('transcriptionArea').classList.remove('empty');
                    document.getElementById('transcriptionArea').classList.add('typing');
                    
                    // Start updating transcription display
                    transcriptionUpdateInterval = setInterval(updateTranscription, 500);
                }
            } catch (error) {
                console.error('Failed to start recording:', error);
                alert('Failed to start recording. Please check console for details.');
            }
        }
        
        async function stopRecording() {
            try {
                const response = await fetch('/stop', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    isRecording = false;
                    document.getElementById('startBtn').disabled = false;
                    document.getElementById('stopBtn').disabled = true;
                    document.getElementById('waveform').classList.remove('active');
                    
                    // Stop updating transcription display
                    if (transcriptionUpdateInterval) {
                        clearInterval(transcriptionUpdateInterval);
                        transcriptionUpdateInterval = null;
                    }
                    
                    // Final transcription update
                    await updateTranscription();
                }
            } catch (error) {
                console.error('Failed to stop recording:', error);
            }
        }
        
        async function updateTranscription() {
            try {
                const response = await fetch('/transcript');
                const data = await response.json();
                
                const area = document.getElementById('transcriptionArea');
                if (data.transcript && data.transcript.trim()) {
                    area.textContent = data.transcript;
                } else if (!isRecording) {
                    area.textContent = 'Your transcription will appear here...';
                    area.classList.add('empty');
                }
            } catch (error) {
                console.error('Failed to get transcription:', error);
            }
        }
        
        // Check status on load and periodically
        checkStatus();
        setInterval(checkStatus, 5000);
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    """Main page"""
    return render_template_string(HTML_TEMPLATE)

@app.route('/status')
def status():
    """Check if whisper service is ready"""
    global whisper_service
    return jsonify({
        'ready': whisper_service is not None,
        'version': '3.5.4',
        'model': 'base'
    })

@app.route('/start', methods=['POST'])
def start_recording():
    """Start recording session"""
    global whisper_service
    
    if not whisper_service:
        return jsonify({'success': False, 'error': 'Whisper service not initialized'})
    
    try:
        # Reset current transcript
        with transcript_lock:
            globals()['current_transcript'] = ""
        
        # Start listening (simplified - in real app this would handle hotkeys)
        whisper_service.start_listening()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/stop', methods=['POST'])
def stop_recording():
    """Stop recording session"""
    global whisper_service
    
    if not whisper_service:
        return jsonify({'success': False, 'error': 'Whisper service not initialized'})
    
    try:
        # Stop listening and get final transcription
        transcript = whisper_service.stop_listening()
        
        return jsonify({'success': True, 'transcript': transcript})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/transcript')
def get_transcript():
    """Get current transcript"""
    with transcript_lock:
        return jsonify({
            'transcript': globals()['current_transcript'],
            'recording': whisper_service.is_listening() if whisper_service else False
        })

if __name__ == '__main__':
    print("🎤 Starting SONU Web Demo...")
    print("📍 Visit http://localhost:5000 in your browser")
    print("⏹️  Press Ctrl+C to stop")
    
    # Initialize whisper service
    if init_whisper():
        print("✅ Whisper service initialized successfully")
        print("🚀 Starting web server...")
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        print("❌ Failed to initialize Whisper service")
        print("Please check that Python dependencies are installed correctly.")