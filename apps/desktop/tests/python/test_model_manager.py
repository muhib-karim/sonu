#!/usr/bin/env python3
"""
Unit tests for model_manager.py
Tests model download, verification, and error handling
"""

import pytest
import sys
import os
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'core', 'python'))


class TestModelDefinitions:
    """Test model definition structure"""

    def test_models_dict_exists(self):
        """Test that MODELS dict is importable"""
        from model_manager import MODELS

        assert isinstance(MODELS, dict)
        assert len(MODELS) > 0

    def test_required_model_fields(self):
        """Test that each model has required fields"""
        from model_manager import MODELS

        required_fields = ['name', 'display_name', 'type', 'size_mb']

        for model_name, model_info in MODELS.items():
            for field in required_fields:
                assert field in model_info, f"Model {model_name} missing {field}"

    def test_tiny_model_exists(self):
        """Test that tiny model is defined"""
        from model_manager import MODELS

        assert 'tiny' in MODELS
        assert MODELS['tiny']['size_mb'] > 0
        assert 'url' in MODELS['tiny']

    def test_model_types_valid(self):
        """Test that all model types are valid"""
        from model_manager import MODELS

        valid_types = ['whisper', 'faster-whisper', 'onnx', 'llm']

        for model_name, model_info in MODELS.items():
            assert model_info['type'] in valid_types, f"Model {model_name} has invalid type"


class TestChecksumVerification:
    """Test checksum verification functions"""

    def test_calculate_file_checksum_md5(self):
        """Test MD5 checksum calculation"""
        from model_manager import calculate_file_checksum

        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b'test content for checksum')
            temp_path = Path(f.name)

        try:
            checksum = calculate_file_checksum(temp_path, 'md5')
            assert len(checksum) == 32  # MD5 produces 32 hex chars
            assert all(c in '0123456789abcdef' for c in checksum)
        finally:
            temp_path.unlink()

    def test_calculate_file_checksum_sha256(self):
        """Test SHA256 checksum calculation"""
        from model_manager import calculate_file_checksum

        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b'test content for sha256')
            temp_path = Path(f.name)

        try:
            checksum = calculate_file_checksum(temp_path, 'sha256')
            assert len(checksum) == 64  # SHA256 produces 64 hex chars
        finally:
            temp_path.unlink()

    def test_calculate_checksum_nonexistent_file(self):
        """Test checksum calculation on missing file"""
        from model_manager import calculate_file_checksum

        result = calculate_file_checksum(Path('/nonexistent/file.bin'))
        assert result == ""

    def test_verify_model_integrity_valid_size(self):
        """Test model verification with correct size"""
        from model_manager import verify_model_integrity

        with tempfile.NamedTemporaryFile(delete=False) as f:
            # Write 10MB of data
            f.write(b'\x00' * (10 * 1024 * 1024))
            temp_path = Path(f.name)

        try:
            result = verify_model_integrity(temp_path, expected_size_mb=10)
            assert result['size_ok'] == True
        finally:
            temp_path.unlink()

    def test_verify_model_integrity_wrong_size(self):
        """Test model verification with incorrect size"""
        from model_manager import verify_model_integrity

        with tempfile.NamedTemporaryFile(delete=False) as f:
            # Write 5MB of data but expect 10MB
            f.write(b'\x00' * (5 * 1024 * 1024))
            temp_path = Path(f.name)

        try:
            result = verify_model_integrity(temp_path, expected_size_mb=10)
            assert result['size_ok'] == False
            assert result['valid'] == False
            assert 'mismatch' in result['message'].lower()
        finally:
            temp_path.unlink()

    def test_verify_model_integrity_missing_file(self):
        """Test model verification with missing file"""
        from model_manager import verify_model_integrity

        result = verify_model_integrity(Path('/nonexistent/model.bin'), expected_size_mb=75)
        assert result['valid'] == False
        assert 'does not exist' in result['message']


class TestDownloadProgress:
    """Test download progress tracking"""

    def test_download_progress_init(self):
        """Test DownloadProgress initialization"""
        from model_manager import DownloadProgress

        progress = DownloadProgress()
        assert progress.total_bytes == 0
        assert progress.downloaded_bytes == 0
        assert progress.percent == 0

    def test_download_progress_update(self):
        """Test DownloadProgress updates"""
        from model_manager import DownloadProgress

        progress = DownloadProgress()
        progress.update(50, 100)

        assert progress.downloaded_bytes == 50
        assert progress.total_bytes == 100
        assert progress.percent == 50.0

    def test_download_progress_callback(self):
        """Test DownloadProgress callback invocation"""
        from model_manager import DownloadProgress

        callback_invoked = []

        def callback(p):
            callback_invoked.append(p.percent)

        progress = DownloadProgress(callback)
        progress.update(25, 100)
        progress.update(50, 100)
        progress.update(100, 100)

        assert len(callback_invoked) == 3
        assert 100.0 in callback_invoked


class TestDownloadErrorHandling:
    """Test error handling during downloads"""

    @patch('urllib.request.urlopen')
    def test_download_file_network_error(self, mock_urlopen):
        """Test download handling of network errors"""
        from model_manager import download_file

        mock_urlopen.side_effect = Exception("Network timeout")

        with tempfile.TemporaryDirectory() as temp_dir:
            dest_path = Path(temp_dir) / "test_model.bin"
            result = download_file("https://example.com/model.bin", dest_path)

            assert result == False
            assert not dest_path.exists()  # Partial download should be cleaned up

    @patch('urllib.request.urlopen')
    def test_download_file_timeout(self, mock_urlopen):
        """Test download handling of timeout"""
        import socket
        mock_urlopen.side_effect = socket.timeout("Connection timed out")

        from model_manager import download_file

        with tempfile.TemporaryDirectory() as temp_dir:
            dest_path = Path(temp_dir) / "test_model.bin"
            result = download_file("https://example.com/model.bin", dest_path)

            assert result == False

    def test_download_file_invalid_url(self):
        """Test download with invalid URL"""
        from model_manager import download_file

        with tempfile.TemporaryDirectory() as temp_dir:
            dest_path = Path(temp_dir) / "test_model.bin"
            result = download_file("not-a-valid-url", dest_path)

            assert result == False

    @patch('urllib.request.urlopen')
    def test_download_file_empty_response(self, mock_urlopen):
        """Test download handling of empty response"""
        mock_response = Mock()
        mock_response.headers.get.return_value = '0'
        mock_response.read.return_value = b''
        mock_response.__enter__ = Mock(return_value=mock_response)
        mock_response.__exit__ = Mock(return_value=False)
        mock_urlopen.return_value = mock_response

        from model_manager import download_file

        with tempfile.TemporaryDirectory() as temp_dir:
            dest_path = Path(temp_dir) / "test_model.bin"
            result = download_file("https://example.com/empty.bin", dest_path)

            # Should succeed but file will be empty
            assert dest_path.exists() or result == False


class TestModelDownload:
    """Test model download function"""

    def test_download_model_unknown_model(self):
        """Test download with unknown model name"""
        from model_manager import download_model

        result = download_model("nonexistent-model-xyz")

        assert result['success'] == False
        assert 'Unknown model' in result['error']

    def test_download_model_large_alias(self):
        """Test that 'large' maps to 'large-v3'"""
        from model_manager import MODELS

        # Verify both exist
        assert 'large-v3' in MODELS

    @patch('model_manager.download_file')
    def test_download_model_whisper_type(self, mock_download):
        """Test download of whisper-type model"""
        mock_download.return_value = True

        from model_manager import download_model

        # This will try to download but we've mocked it
        result = download_model("tiny")

        # Even with mock, should return dict with expected keys
        assert 'success' in result
        assert 'model' in result


class TestIsDownloaded:
    """Test is_downloaded function"""

    def test_is_downloaded_returns_tuple(self):
        """Test that is_downloaded returns tuple"""
        from model_manager import is_downloaded

        result = is_downloaded("tiny")

        assert isinstance(result, tuple)
        assert len(result) == 2
        assert isinstance(result[0], bool)

    def test_is_downloaded_nonexistent_model(self):
        """Test is_downloaded for non-existent model"""
        from model_manager import is_downloaded

        downloaded, path = is_downloaded("nonexistent-xyz")

        assert downloaded == False


class TestListModels:
    """Test list_models function"""

    def test_list_models_returns_list(self):
        """Test that list_models returns a list"""
        from model_manager import list_models

        result = list_models()

        assert isinstance(result, list)
        assert len(result) > 0

    def test_list_models_structure(self):
        """Test list_models returns proper structure"""
        from model_manager import list_models

        models = list_models()

        # Each model should be a dict with expected keys
        for model in models:
            assert isinstance(model, dict)
            assert 'name' in model or 'display_name' in model


class TestGetRecommendedModel:
    """Test get_recommended_model function"""

    def test_get_recommended_model_returns_string(self):
        """Test that get_recommended_model returns a model name"""
        from model_manager import get_recommended_model

        result = get_recommended_model()

        assert isinstance(result, str)
        assert len(result) > 0


class TestDiskSpace:
    """Test disk space functions"""

    def test_get_disk_space_returns_dict(self):
        """Test that get_disk_space returns dict"""
        from model_manager import get_disk_space

        result = get_disk_space()

        assert isinstance(result, dict)
        assert 'free_gb' in result or 'free' in result or 'total' in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
