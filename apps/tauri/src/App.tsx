import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface Settings {
  model_path: string;
  hotkey: string;
  mode: "HoldToRecord" | "ToggleRecord";
  auto_paste: boolean;
  vad_enabled: boolean;
  vad_threshold: number;
}

interface ModelInfo {
  name: string;
  size_mb: number;
  speed: string;
  accuracy: string;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [lastTranscription, setLastTranscription] = useState("");
  const [status, setStatus] = useState("Ready");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);

  // Load initial state
  useEffect(() => {
    loadSettings();
    loadModels();
    checkModelStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await invoke<Settings>("get_settings");
      setSettings(s);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  const loadModels = async () => {
    try {
      const models = await invoke<ModelInfo[]>("get_available_models");
      setAvailableModels(models);
    } catch (e) {
      console.error("Failed to load models:", e);
    }
  };

  const checkModelStatus = async () => {
    try {
      const loaded = await invoke<boolean>("is_model_loaded");
      setIsModelLoaded(loaded);
      setStatus(loaded ? "Ready" : "No model loaded");
    } catch (e) {
      console.error("Failed to check model status:", e);
    }
  };

  const startRecording = async () => {
    if (!isModelLoaded) {
      setStatus("Please load a model first");
      return;
    }

    try {
      await invoke("start_recording");
      setIsRecording(true);
      setStatus("Recording...");
    } catch (e) {
      console.error("Failed to start recording:", e);
      setStatus(`Error: ${e}`);
    }
  };

  const stopRecording = async () => {
    try {
      setStatus("Processing...");
      const text = await invoke<string>("transcribe_and_paste");
      setIsRecording(false);
      setLastTranscription(text);
      setStatus(text ? "Transcribed!" : "No speech detected");
    } catch (e) {
      console.error("Failed to stop recording:", e);
      setStatus(`Error: ${e}`);
      setIsRecording(false);
    }
  };

  const loadModel = async (modelName: string) => {
    setStatus(`Loading ${modelName} model...`);
    try {
      // Get model path from home directory
      const home = await invoke<string>("get_model_path", { modelName });
      await invoke("load_model", { path: home });
      setIsModelLoaded(true);
      setStatus(`${modelName} model loaded!`);
      await loadSettings();
    } catch (e) {
      console.error("Failed to load model:", e);
      setStatus(`Failed to load model: ${e}`);
    }
  };

  const updateSettings = async (newSettings: Settings) => {
    try {
      await invoke("update_settings", { newSettings });
      setSettings(newSettings);
    } catch (e) {
      console.error("Failed to update settings:", e);
    }
  };

  // Handle Hold-to-Record mode with mouse/touch
  const handleRecordButton = useCallback(
    async (isDown: boolean) => {
      if (settings?.mode === "HoldToRecord") {
        if (isDown) {
          await startRecording();
        } else if (isRecording) {
          await stopRecording();
        }
      } else {
        // Toggle mode
        if (isDown) {
          if (isRecording) {
            await stopRecording();
          } else {
            await startRecording();
          }
        }
      }
    },
    [isRecording, settings?.mode]
  );

  return (
    <div className="app">
      <header className="header">
        <h1>SONU</h1>
        <p className="subtitle">Fast Offline Voice Typing</p>
      </header>

      <main className="main">
        {/* Record Button */}
        <div className="record-container">
          <button
            className={`record-button ${isRecording ? "recording" : ""}`}
            onMouseDown={() => handleRecordButton(true)}
            onMouseUp={() => handleRecordButton(false)}
            onMouseLeave={() => isRecording && handleRecordButton(false)}
            disabled={!isModelLoaded}
          >
            <div className="mic-icon">🎤</div>
            <span className="record-text">
              {isRecording ? "Recording..." : "Hold to Speak"}
            </span>
          </button>
        </div>

        {/* Status */}
        <div className="status">
          <span className={`status-indicator ${isModelLoaded ? "ready" : "not-ready"}`} />
          {status}
        </div>

        {/* Last Transcription */}
        {lastTranscription && (
          <div className="transcription">
            <h3>Last Transcription:</h3>
            <p>{lastTranscription}</p>
          </div>
        )}

        {/* Model Selection */}
        {!isModelLoaded && (
          <div className="model-selection">
            <h3>Select a Model:</h3>
            <div className="model-grid">
              {availableModels.map((model) => (
                <button
                  key={model.name}
                  className="model-card"
                  onClick={() => loadModel(model.name)}
                >
                  <div className="model-name">{model.name}</div>
                  <div className="model-stats">
                    <span>{model.size_mb} MB</span>
                    <span>{model.speed}</span>
                    <span>{model.accuracy}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <button
          className="settings-button"
          onClick={() => setShowSettings(!showSettings)}
        >
          ⚙️ Settings
        </button>
        <span className="version">v2.0.0 (Tauri)</span>
      </footer>

      {/* Settings Modal */}
      {showSettings && settings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Settings</h2>

            <div className="setting-group">
              <label>Recording Mode:</label>
              <select
                value={settings.mode}
                onChange={(e) =>
                  updateSettings({
                    ...settings,
                    mode: e.target.value as "HoldToRecord" | "ToggleRecord",
                  })
                }
              >
                <option value="HoldToRecord">Hold to Record</option>
                <option value="ToggleRecord">Toggle Record</option>
              </select>
            </div>

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.auto_paste}
                  onChange={(e) =>
                    updateSettings({ ...settings, auto_paste: e.target.checked })
                  }
                />
                Auto-paste transcription
              </label>
            </div>

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.vad_enabled}
                  onChange={(e) =>
                    updateSettings({ ...settings, vad_enabled: e.target.checked })
                  }
                />
                Voice Activity Detection
              </label>
            </div>

            {settings.vad_enabled && (
              <div className="setting-group">
                <label>VAD Sensitivity:</label>
                <input
                  type="range"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                  value={settings.vad_threshold}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      vad_threshold: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            )}

            <button className="close-button" onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
