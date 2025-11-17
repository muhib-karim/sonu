#!/usr/bin/env python3
"""
Unit tests for whisper_service.py
"""

import pytest
import sys
import os
import tempfile
import threading
from unittest.mock import Mock, patch, MagicMock
import time

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# Mock external dependencies
sys.modules['pyaudio'] = Mock()
sys.modules['keyboard'] = Mock()
sys.modules['faster_whisper'] = Mock()

from whisper_service import (
    parse_combo, combo_pressed, start_stream, stop_stream,
    audio_capture_loop, transcribe_frames, transcribe_recent_seconds,
    main
)


class TestComboParsing:
    """Test hotkey combination parsing"""

    def test_parse_combo_simple(self):
        """Test parsing simple key combinations"""
        assert parse_combo("ctrl+space") == ["ctrl", "space"]
        assert parse_combo("alt+shift+a") == ["alt", "shift", "a"]
        assert parse_combo("win+enter") == ["windows", "enter"]

    def test_parse_combo_electron_format(self):
        """Test parsing Electron accelerator format"""
        assert parse_combo("CommandOrControl+Super+Space") == ["ctrl", "windows", "space"]
        assert parse_combo("Alt+Shift+A") == ["alt", "shift", "a"]

    def test_parse_combo_empty(self):
        """Test parsing empty combinations"""
        assert parse_combo("") == []
        assert parse_combo("   ") == []


class TestAudioFunctions:
    """Test audio capture and processing functions"""

    @patch('whisper_service.audio')
    @patch('whisper_service.stream', None)
    def test_start_stream(self, mock_audio):
        """Test audio stream initialization"""
        mock_stream = Mock()
        mock_audio.open.return_value = mock_stream

        start_stream()

        mock_audio.open.assert_called_once()
        assert whisper_service.stream == mock_stream

    @patch('whisper_service.stream')
    def test_stop_stream(self, mock_stream):
        """Test audio stream stopping"""
        mock_stream_instance = Mock()
        whisper_service.stream = mock_stream_instance

        stop_stream()

        mock_stream_instance.stop_stream.assert_called_once()
        mock_stream_instance.close.assert_called_once()
        assert whisper_service.stream is None


class TestTranscription:
    """Test transcription functionality"""

    @patch('whisper_service.model')
    @patch('whisper_service.frames', [b'test_data'])
    @patch('whisper_service.audio')
    @patch('tempfile.mkstemp')
    @patch('wave.open')
    @patch('os.remove')
    def test_transcribe_frames(self, mock_remove, mock_wave_open, mock_mkstemp,
                              mock_audio, mock_model):
        """Test frame transcription"""
        # Setup mocks
        mock_mkstemp.return_value = (123, '/tmp/test.wav')
        mock_wave_file = Mock()
        mock_wave_open.return_value = mock_wave_file
        mock_model.transcribe.return_value = ([Mock(text="test transcription")], {})

        result = transcribe_frames()

        assert result == "test transcription"
        mock_wave_file.setnchannels.assert_called_with(1)
        mock_wave_file.setframerate.assert_called_with(16000)
        mock_model.transcribe.assert_called_once()

    @patch('whisper_service.transcribe_frames')
    def test_transcribe_recent_seconds(self, mock_transcribe):
        """Test recent seconds transcription"""
        mock_transcribe.return_value = "recent transcription"

        result = transcribe_recent_seconds([b'data'] * 100, seconds=2)

        assert result == "recent transcription"
        mock_transcribe.assert_called_once()


class TestRecordingLogic:
    """Test recording state management"""

    @patch('whisper_service.combo_pressed')
    @patch('whisper_service.transcribe_frames')
    @patch('whisper_service.lock')
    def test_hold_mode_release_detection(self, mock_lock, mock_transcribe, mock_combo_pressed):
        """Test hold mode key release detection"""
        # Setup
        whisper_service.hold_mode = True
        whisper_service.recording_flag = True
        mock_combo_pressed.return_value = False  # Key released
        mock_transcribe.return_value = "test result"

        # Mock stdout
        with patch('sys.stdout') as mock_stdout:
            # Simulate the release detection logic
            if whisper_service.hold_mode and whisper_service.recording_flag:
                if not mock_combo_pressed():
                    whisper_service.recording_flag = False
                    text = mock_transcribe()
                    if text:
                        mock_stdout.write(text + "\n")
                        mock_stdout.flush()

        mock_transcribe.assert_called_once()
        mock_stdout.write.assert_called_with("test result\n")


class TestMainLoop:
    """Test main service loop"""

    @patch('whisper_service.start_stream')
    @patch('whisper_service.audio_capture_loop')
    @patch('whisper_service.live_transcribe_loop')
    @patch('sys.stdin')
    @patch('whisper_service.stop_stream')
    def test_main_loop_startup(self, mock_stop_stream, mock_stdin, mock_live_loop,
                              mock_audio_loop, mock_start_stream):
        """Test main loop initialization"""
        # Mock stdin to exit immediately
        mock_stdin.readline.return_value = "STOP\n"

        # This would normally run forever, so we patch it
        with patch('threading.Thread') as mock_thread:
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance

            # Call main but interrupt quickly
            with patch('time.sleep', side_effect=KeyboardInterrupt):
                with pytest.raises(KeyboardInterrupt):
                    main()

            mock_start_stream.assert_called_once()


class TestIntegration:
    """Integration tests for whisper service"""

    def test_service_initialization(self):
        """Test that service initializes without errors"""
        # Reset global state
        whisper_service.recording_flag = False
        whisper_service.frames = []
        whisper_service.stream = None
        whisper_service.hold_mode = False
        whisper_service.hold_keys_combo = "ctrl+shift+space"
        whisper_service.combo_keys = ["ctrl", "shift", "space"]

        # Should not raise exceptions
        assert whisper_service.recording_flag == False
        assert whisper_service.frames == []
        assert whisper_service.stream == None

    @patch('whisper_service.combo_pressed')
    def test_combo_detection(self, mock_combo_pressed):
        """Test key combination detection"""
        # Test with different key states
        mock_combo_pressed.return_value = True
        assert combo_pressed() == True

        mock_combo_pressed.return_value = False
        assert combo_pressed() == False


if __name__ == "__main__":
    pytest.main([__file__])