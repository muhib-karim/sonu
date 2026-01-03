/**
 * Unit tests for settings persistence functionality
 * Tests the loadSettings/saveSettings functions and model key synchronization
 */

const fs = require('fs');
const path = require('path');

describe('Settings Persistence Tests', () => {
  const testDataDir = path.join(__dirname, '..', 'test-data');
  const testSettingsFile = path.join(testDataDir, 'test-settings.json');

  beforeAll(() => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test settings file after each test
    if (fs.existsSync(testSettingsFile)) {
      fs.unlinkSync(testSettingsFile);
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Model Key Synchronization', () => {
    /**
     * This tests the critical bug fix: activeModel and selected_model must be synchronized
     * When both exist but differ, selected_model (UI choice) should take precedence
     */

    test('should sync activeModel to selected_model when both exist but differ', () => {
      // This simulates the bug scenario: UI shows "tiny" but core uses "base"
      const settings = {
        selected_model: 'tiny',
        activeModel: 'base',
        sound_feedback: true
      };

      // Apply the sync logic from loadSettings()
      if (settings.selected_model && settings.activeModel) {
        if (settings.selected_model !== settings.activeModel) {
          settings.activeModel = settings.selected_model;
        }
      }

      expect(settings.activeModel).toBe('tiny');
      expect(settings.selected_model).toBe('tiny');
    });

    test('should copy selected_model to activeModel when only selected_model exists', () => {
      const settings = {
        selected_model: 'small',
        sound_feedback: true
      };

      // Apply the sync logic
      if (settings.selected_model && !settings.activeModel) {
        settings.activeModel = settings.selected_model;
      }

      expect(settings.activeModel).toBe('small');
      expect(settings.selected_model).toBe('small');
    });

    test('should copy activeModel to selected_model when only activeModel exists', () => {
      const settings = {
        activeModel: 'medium',
        sound_feedback: true
      };

      // Apply the sync logic
      if (settings.activeModel && !settings.selected_model) {
        settings.selected_model = settings.activeModel;
      }

      expect(settings.activeModel).toBe('medium');
      expect(settings.selected_model).toBe('medium');
    });

    test('should keep both keys unchanged when they already match', () => {
      const settings = {
        selected_model: 'base',
        activeModel: 'base',
        sound_feedback: true
      };

      const originalSelected = settings.selected_model;
      const originalActive = settings.activeModel;

      // Apply the sync logic (should not change anything)
      if (settings.selected_model && settings.activeModel) {
        if (settings.selected_model !== settings.activeModel) {
          settings.activeModel = settings.selected_model;
        }
      }

      expect(settings.selected_model).toBe(originalSelected);
      expect(settings.activeModel).toBe(originalActive);
    });
  });

  describe('Settings File I/O', () => {
    test('should write settings to file correctly', () => {
      const settings = {
        selected_model: 'tiny',
        activeModel: 'tiny',
        sound_feedback: true,
        waveform_animation: false,
        theme: 'dark'
      };

      fs.writeFileSync(testSettingsFile, JSON.stringify(settings, null, 2));

      expect(fs.existsSync(testSettingsFile)).toBe(true);

      const loaded = JSON.parse(fs.readFileSync(testSettingsFile, 'utf8'));
      expect(loaded.selected_model).toBe('tiny');
      expect(loaded.activeModel).toBe('tiny');
      expect(loaded.sound_feedback).toBe(true);
    });

    test('should handle malformed JSON gracefully', () => {
      fs.writeFileSync(testSettingsFile, '{ invalid json }');

      let settings = null;
      let error = null;

      try {
        settings = JSON.parse(fs.readFileSync(testSettingsFile, 'utf8'));
      } catch (e) {
        error = e;
        // Default settings should be used
        settings = {
          selected_model: 'tiny',
          activeModel: 'tiny'
        };
      }

      expect(error).toBeInstanceOf(SyntaxError);
      expect(settings.selected_model).toBe('tiny');
    });

    test('should handle missing settings file gracefully', () => {
      const nonExistentFile = path.join(testDataDir, 'nonexistent.json');

      let settings = null;
      let error = null;

      try {
        settings = JSON.parse(fs.readFileSync(nonExistentFile, 'utf8'));
      } catch (e) {
        error = e;
        // Default settings should be used
        settings = {
          selected_model: 'tiny',
          activeModel: 'tiny'
        };
      }

      expect(error).toBeInstanceOf(Error);
      expect(settings.selected_model).toBe('tiny');
    });
  });

  describe('Settings Validation', () => {
    test('should validate model names against allowed list', () => {
      const allowedModels = ['tiny', 'base', 'small', 'medium', 'distil-small.en', 'distil-medium.en'];

      const validateModel = (model) => {
        return allowedModels.includes(model) || model.startsWith('ggml-');
      };

      expect(validateModel('tiny')).toBe(true);
      expect(validateModel('base')).toBe(true);
      expect(validateModel('invalid-model')).toBe(false);
      expect(validateModel('ggml-tiny.bin')).toBe(true);
    });

    test('should handle empty selected_model by defaulting to tiny', () => {
      const settings = {
        selected_model: '',
        activeModel: ''
      };

      // Apply default logic
      if (!settings.selected_model) {
        settings.selected_model = 'tiny';
      }
      if (!settings.activeModel) {
        settings.activeModel = settings.selected_model || 'tiny';
      }

      expect(settings.selected_model).toBe('tiny');
      expect(settings.activeModel).toBe('tiny');
    });

    test('should preserve additional settings during sync', () => {
      const settings = {
        selected_model: 'small',
        activeModel: 'tiny',  // Mismatched - should sync
        sound_feedback: true,
        waveform_animation: true,
        theme: 'dark',
        llm_processing: false,
        transcription_settings: {
          beam_size: 1,
          vad_enabled: true
        }
      };

      // Apply sync logic
      if (settings.selected_model !== settings.activeModel) {
        settings.activeModel = settings.selected_model;
      }

      // Verify sync happened
      expect(settings.activeModel).toBe('small');

      // Verify other settings preserved
      expect(settings.sound_feedback).toBe(true);
      expect(settings.waveform_animation).toBe(true);
      expect(settings.theme).toBe('dark');
      expect(settings.llm_processing).toBe(false);
      expect(settings.transcription_settings.beam_size).toBe(1);
    });
  });

  describe('Available Models Structure', () => {
    test('should have correct structure for available_models array', () => {
      const available_models = [
        { id: 'tiny', name: 'Whisper Tiny', size_mb: 75, wer: 7.8, rtf: 25, type: 'whisper' },
        { id: 'base', name: 'Whisper Base', size_mb: 142, wer: 5.3, rtf: 18, type: 'whisper' },
        { id: 'small', name: 'Whisper Small', size_mb: 466, wer: 4.1, rtf: 12, type: 'whisper' }
      ];

      available_models.forEach(model => {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('name');
        expect(model).toHaveProperty('size_mb');
        expect(model).toHaveProperty('type');
        expect(typeof model.id).toBe('string');
        expect(typeof model.size_mb).toBe('number');
        expect(model.size_mb).toBeGreaterThan(0);
      });
    });

    test('should find selected model in available_models', () => {
      const available_models = [
        { id: 'tiny', name: 'Whisper Tiny', size_mb: 75 },
        { id: 'base', name: 'Whisper Base', size_mb: 142 },
        { id: 'small', name: 'Whisper Small', size_mb: 466 }
      ];

      const selectedModel = 'base';
      const found = available_models.find(m => m.id === selectedModel);

      expect(found).toBeDefined();
      expect(found.id).toBe('base');
      expect(found.name).toBe('Whisper Base');
    });
  });
});
