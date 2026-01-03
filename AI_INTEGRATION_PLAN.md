# SONU AI Integration Plan: "Command Mode" & Context Awareness

**Goal:** Transform SONU from a dictation tool into an intelligent AI writing assistant by integrating a local LLM (Large Language Model) and context-aware features, similar to Wispr Flow and Typeless, while maintaining 100% offline functionality.

## 1. Architecture Overview

To support these new features without destabilizing the existing stable transcription engine, we will adopt a micro-service approach within the desktop application:

*   **Transcription Service (Existing)**: `whisper_service.py` (Fast, dedicated to audio-to-text).
*   **Intelligence Service (New)**: `llm_service.py` (Handles "Command Mode" logic, text rewriting, and summarization).
*   **Context Manager (New)**: `context_manager.js` (Node.js module for active window detection).

## 2. Feature Breakdown

### A. Command Mode ("Magic Edit")
*   **Function:** Allows users to modify the last transcribed text (or selected text) using voice commands (e.g., "Make it professional", "Rewrite as a list").
*   **Tech Stack:** 
    *   **Engine:** `llama.cpp` (via `llama-cpp-python` bindings) for CPU-optimized inference.
    *   **Model:** Microsoft **Phi-3 Mini (3.8B)** or **Llama 3.2 3B** (Quantized to q4_k_m for low RAM usage ~2GB).
    *   **UI:** A floating "Command Bar" overlay that appears on a specific hotkey.

### B. App-Specific Profiles ("Chameleon Mode")
*   **Function:** Automatically switches settings (Style, Model, Prompt) based on the active application.
*   **Tech Stack:** `@paymoapp/active-window` (Node.js native module).
*   **Logic:** 
    *   `vscode.exe` -> Code Profile (Preserve formatting).
    *   `slack.exe` -> Chat Profile (Casual tone).

## 3. Step-by-Step Implementation Plan

### Phase 1: LLM Backend Infrastructure (Python)

1.  **Dependencies**: Add `llama-cpp-python` to `requirements.txt`.
2.  **Model Management**:
    *   Update `model_manager.py` to support downloading `.gguf` files from HuggingFace (e.g., `microsoft/Phi-3-mini-4k-instruct-gguf`).
    *   Add a new "AI Models" tab in the Settings UI to manage these larger downloads separately from Whisper models.
3.  **Service Creation**:
    *   Create `apps/desktop/llm_service.py`.
    *   Implement a persistent process that loads the model once (to avoid reload latency).
    *   Expose a standard API via stdin/stdout or a local WebSocket: `generate(prompt, context)`.

### Phase 2: IPC & Main Process Integration (Electron)

1.  **Process Management**:
    *   Update `apps/desktop/main.js` to spawn `llm_service.py` on startup (optional/lazy-loaded).
    *   Implement IPC handlers: `LLM_GENERATE`, `LLM_STATUS`, `LLM_LOAD`.
2.  **Safety**:
    *   Ensure `llm_service.py` runs at a lower process priority to prevent CPU starvation of the audio transcription.

### Phase 3: "Command Mode" UI & UX

1.  **Hotkey**: Register a new global hotkey (e.g., `Ctrl+Win+E`) to trigger Command Mode.
2.  **Overlay Window**:
    *   Create a transparent, frameless `BrowserWindow` centered on the screen or near the cursor.
    *   **UI**: A text input field (for the command) + a preview area for the diff.
3.  **Workflow**:
    *   User dictates text.
    *   User presses Hotkey -> "Make that a bulleted list."
    *   App sends request to `llm_service`.
    *   App replaces the text in the active window.

### Phase 4: Context Awareness

1.  **Native Module**: Install `@paymoapp/active-window`.
2.  **Context Service**:
    *   Create `apps/desktop/src/context_manager.js`.
    *   Poll active window every 1-2 seconds (low overhead).
3.  **Configuration**:
    *   Create `apps/desktop/data/profiles.json`.
    *   Map `process_name` to `style_preset_id`.

## 4. Risk Mitigation

*   **Performance**: Running Whisper AND an LLM simultaneously on 8GB RAM machines is risky.
    *   *Mitigation*: Pause Whisper model (unload or suspend) when LLM is generating, and vice-versa. Or explicitly require 16GB+ for LLM features.
*   **Installer Size**: LLM models are large (2GB+).
    *   *Mitigation*: **Do not bundle the LLM.** Make it an optional in-app download.
*   **Dependency Conflicts**: `llama-cpp-python` and `faster-whisper` both use heavy compute libraries.
    *   *Mitigation*: Use CPU-only wheels for `llama.cpp` by default to avoid CUDA version mismatches with `faster-whisper`.

## 5. Execution Order

1.  [ ] **Prototype LLM Service**: Verify `phi-3` runs locally in a standalone Python script.
2.  [ ] **Build Model Downloader**: Allow users to get the model.
3.  [ ] **Integrate IPC**: Connect Electron to Python.
4.  [ ] **Build UI**: The "Command Mode" overlay.
5.  [ ] **Implement Context Awareness**: The background watcher.
