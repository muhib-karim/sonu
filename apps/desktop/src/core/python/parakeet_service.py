#!/usr/bin/env python3
"""
Parakeet Service - Nvidia Parakeet v3 ASR Integration

This service provides speech-to-text transcription using Nvidia's Parakeet v3
state-of-the-art automatic speech recognition model. The model supports 25
European languages and uses the NeMo toolkit for inference.

Model: parakeet-tdt-0.6b-v3
Architecture: FastConformer-TDT (Transducer with Decoder TDT)
Languages: 25 European languages
WER (LibriSpeech clean): 1.93%
"""

import sys
import os
import json
import time
import threading
import subprocess
import signal
from pathlib import Path
from datetime import datetime

# Try to import NeMo dependencies
try:
    import torch
    NVIDIA_CUDA_AVAILABLE = torch.cuda.is_available()
    print(f"CUDA available: {NVIDIA_CUDA_AVAILABLE}", flush=True)
    if NVIDIA_CUDA_AVAILABLE:
        print(f"GPU: {torch.cuda.get_device_name(0)}", flush=True)
except ImportError:
    NVIDIA_CUDA_AVAILABLE = False
    print("PyTorch not available - CPU inference only", flush=True)

try:
    import nemo_toolkit
    from nemo.collections.asr.models import EncDecTransducerModel
    NEMO_AVAILABLE = True
except ImportError:
    NEMO_AVAILABLE = False
    print("NeMo toolkit not installed - install with: pip install nemo_toolkit['asr']", flush=True)

# Audio processing
try:
    import numpy as np
    import soundfile as sf
    AUDIO_DEPENDENCIES = True
except ImportError:
    AUDIO_DEPENDENCIES = False
    print("Audio dependencies (numpy, soundfile) not installed", flush=True)

# Parakeet v3 supported languages (25 European languages)
PARAKEET_LANGUAGES = {
    'en': 'English',
    'de': 'German',
    'es': 'Spanish',
    'fr': 'French',
    'it': 'Italian',
    'pt': 'Portuguese',
    'nl': 'Dutch',
    'ru': 'Russian',
    'uk': 'Ukrainian',
    'pl': 'Polish',
    'cs': 'Czech',
    'ro': 'Romanian',
    'hu': 'Hungarian',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sk': 'Slovak',
    'sl': 'Slovenian',
    'lt': 'Lithuanian',
    'lv': 'Latvian',
    'et': 'Estonian',
    'el': 'Greek'
}

# Service state
service_state = {
    'running': False,
    'model_loaded': False,
    'model': None,
    'current_language': 'en',
    'continuous_dictation': False,
    'low_latency': False,
    'noise_reduction': False,
    'vad_enabled': True,
    'transcribe_queue': [],
    'output_buffer': '',
    'last_activity': None
}

# Output lock for thread-safe output
output_lock = threading.Lock()


def send_output(message_type, content, **kwargs):
    """Send formatted output to stdout for IPC communication."""
    output = {
        'type': message_type,
        'content': content,
        'timestamp': datetime.now().isoformat(),
        **kwargs
    }
    with output_lock:
        print(f"JSON_OUTPUT:{json.dumps(output)}", flush=True)


def log_message(message):
    """Log a message to stdout."""
    print(f"LOG:{message}", flush=True)


def signal_handler(signum, frame):
    """Handle shutdown signals gracefully."""
    log_message(f"Received signal {signum}, shutting down...")
    shutdown_service()
    sys.exit(0)


def load_model():
    """
    Load the Parakeet v3 model into memory.
    
    Returns:
        bool: True if model loaded successfully, False otherwise
    """
    if not NEMO_AVAILABLE:
        log_message("NeMo toolkit not available, cannot load Parakeet model")
        return False
    
    try:
        model_path = Path(__file__).parent / 'models' / 'parakeet-v3'
        nemo_file = model_path / 'parakeet-tdt-0.6b-v3.nemo'
        
        if not nemo_file.exists():
            log_message(f"Parakeet model not found at {nemo_file}")
            log_message("Download from: https://ngc.nvidia.com/catalog/models/nvidia:nemo:parakeet-tdt-0.6b-v3")
            return False
        
        log_message(f"Loading Parakeet v3 model from {nemo_file}...")
        
        # Load with GPU if available
        if NVIDIA_CUDA_AVAILABLE:
            model = EncDecTransducerModel.restore_from(nemo_file, map_location='cuda')
            log_message("Model loaded on GPU")
        else:
            model = EncDecTransducerModel.restore_from(nemo_file)
            log_message("Model loaded on CPU")
        
        service_state['model'] = model
        service_state['model_loaded'] = True
        log_message("Parakeet v3 model loaded successfully")
        
        return True
        
    except Exception as e:
        log_message(f"Failed to load Parakeet model: {e}")
        service_state['model_loaded'] = False
        return False


def transcribe_audio(audio_path, language=None):
    """
    Transcribe an audio file using Parakeet v3.
    
    Args:
        audio_path (str): Path to the audio file
        language (str): Language code for transcription (optional, auto-detect if not provided)
    
    Returns:
        dict: Transcription result with text and metadata
    """
    if not service_state['model_loaded']:
        return {'success': False, 'error': 'Model not loaded'}
    
    if not AUDIO_DEPENDENCIES:
        return {'success': False, 'error': 'Audio dependencies not available'}
    
    try:
        # Load audio file
        audio, sample_rate = sf.read(audio_path)
        
        # Resample if necessary (Parakeet expects 16kHz)
        if sample_rate != 16000:
            import scipy.signal
            audio = scipy.signal.resample(audio, int(len(audio) * 16000 / sample_rate))
        
        # Transcribe
        model = service_state['model']
        
        if language and language in PARAKEET_LANGUAGES:
            # Use specific language
            log_message(f"Transcribing in {PARAKEET_LANGUAGES[language]}")
            # Parakeet v3 doesn't have explicit language parameter
            # It automatically detects among supported languages
            transcript = model.transcribe([audio])[0]
        else:
            # Auto-detect language
            log_message("Auto-detecting language...")
            transcript = model.transcribe([audio])[0]
        
        result = {
            'success': True,
            'text': transcript,
            'language': language or 'auto-detected',
            'timestamp': datetime.now().isoformat()
        }
        
        return result
        
    except Exception as e:
        log_message(f"Transcription error: {e}")
        return {'success': False, 'error': str(e)}


def transcribe_chunk(audio_chunk, sample_rate=16000):
    """
    Transcribe an audio chunk for real-time dictation.
    
    Args:
        audio_chunk (numpy.ndarray): Audio data
        sample_rate (int): Sample rate of audio
    
    Returns:
        str: Transcribed text or empty string
    """
    if not service_state['model_loaded']:
        return ''
    
    try:
        model = service_state['model']
        
        # Resample if necessary
        if sample_rate != 16000:
            import scipy.signal
            audio_chunk = scipy.signal.resample(audio_chunk, int(len(audio_chunk) * 16000 / sample_rate))
        
        # Transcribe
        transcript = model.transcribe([audio_chunk])[0]
        
        return transcript if transcript else ''
        
    except Exception as e:
        log_message(f"Chunk transcription error: {e}")
        return ''


def process_command(command):
    """
    Process a command from the main process.
    
    Args:
        command (dict): Command with type and parameters
    """
    cmd_type = command.get('type', '')
    
    if cmd_type == 'PING':
        send_output('pong', 'Parakeet service ready')
        
    elif cmd_type == 'LOAD_MODEL':
        success = load_model()
        if success:
            send_output('model_loaded', 'Parakeet v3 model loaded', model='parakeet-v3')
        else:
            send_output('error', 'Failed to load Parakeet model')
        
    elif cmd_type == 'UNLOAD_MODEL':
        service_state['model'] = None
        service_state['model_loaded'] = False
        send_output('model_unloaded', 'Parakeet model unloaded')
        
    elif cmd_type == 'TRANSCRIBE':
        audio_path = command.get('path', '')
        language = command.get('language', None)
        if audio_path:
            result = transcribe_audio(audio_path, language)
            send_output('transcription', result.get('text', ''), result=result)
        else:
            send_output('error', 'No audio path provided')
        
    elif cmd_type == 'SET_LANGUAGE':
        language = command.get('language', 'en')
        if language in PARAKEET_LANGUAGES:
            service_state['current_language'] = language
            send_output('language_set', f"Language set to {PARAKEET_LANGUAGES[language]}", language=language)
        else:
            send_output('error', f"Unsupported language: {language}", supported=list(PARAKEET_LANGUAGES.keys()))
        
    elif cmd_type == 'GET_LANGUAGES':
        send_output('languages', PARAKEET_LANGUAGES)
        
    elif cmd_type == 'SET_CONTINUOUS_DICTATION':
        enabled = command.get('enabled', True)
        service_state['continuous_dictation'] = enabled
        send_output('continuous_dictation', enabled)
        
    elif cmd_type == 'SET_LOW_LATENCY':
        enabled = command.get('enabled', False)
        service_state['low_latency'] = enabled
        send_output('low_latency', enabled)
        
    elif cmd_type == 'SET_NOISE_REDUCTION':
        enabled = command.get('enabled', False)
        service_state['noise_reduction'] = enabled
        send_output('noise_reduction', enabled)
        
    elif cmd_type == 'SET_VAD':
        enabled = command.get('enabled', True)
        service_state['vad_enabled'] = enabled
        send_output('vad_enabled', enabled)
        
    elif cmd_type == 'SHUTDOWN':
        shutdown_service()
        
    else:
        send_output('error', f"Unknown command: {cmd_type}")


def shutdown_service():
    """Clean shutdown of the service."""
    service_state['running'] = False
    
    if service_state['model'] is not None:
        # Clean up model resources
        service_state['model'] = None
    
    service_state['model_loaded'] = False
    log_message("Parakeet service shutdown complete")


def main():
    """Main entry point for the Parakeet service."""
    # Register signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # Set working directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    log_message("Starting Parakeet v3 Service...")
    log_message(f"Python: {sys.version}")
    
    # Check dependencies
    log_message(f"NeMo available: {NEMO_AVAILABLE}")
    log_message(f"CUDA available: {NVIDIA_CUDA_AVAILABLE}")
    log_message(f"Audio dependencies: {AUDIO_DEPENDENCIES}")
    
    service_state['running'] = True
    
    # Send ready signal
    send_output('ready', 'Parakeet service initialized', 
                nemo_available=NEMO_AVAILABLE,
                cuda_available=NVIDIA_CUDA_AVAILABLE,
                languages=list(PARAKEET_LANGUAGES.keys()))
    
    # Main command loop
    while service_state['running']:
        try:
            # Read command from stdin
            line = sys.stdin.readline()
            
            if not line:
                # EOF received
                break
            
            line = line.strip()
            
            if not line:
                continue
            
            # Parse command
            if line.startswith('JSON_COMMAND:'):
                json_str = line[13:]
                try:
                    command = json.loads(json_str)
                    process_command(command)
                except json.JSONDecodeError as e:
                    send_output('error', f"Invalid JSON command: {e}")
            else:
                # Handle simple commands
                if line == 'PING':
                    process_command({'type': 'PING'})
                elif line == 'SHUTDOWN':
                    process_command({'type': 'SHUTDOWN'})
                    break
                    
        except Exception as e:
            log_message(f"Error in main loop: {e}")
            send_output('error', str(e))
    
    shutdown_service()


if __name__ == '__main__':
    main()
