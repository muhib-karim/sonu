# SONU AI Features Documentation

**Version 3.6.0+**

SONU now includes powerful offline AI capabilities designed to rival online tools like Wispr Flow and Typeless, while maintaining our strict privacy-first, 100% offline philosophy.

## 1. Command Mode ("Magic Edit")

Command Mode allows you to use AI to modify, rewrite, or generate text based on your existing selection or transcription.

### How it Works
1.  **Select Text**: Highlight any text in any application (Word, Browser, Slack, etc.).
2.  **Trigger**: Press the global hotkey **`Ctrl + Win + E`**.
3.  **Command**: A transparent overlay appears. Speak or type your instruction.
    *   *"Make this more professional"*
    *   *"Fix the grammar errors"*
    *   *"Summarize this into a bulleted list"*
    *   *"Reply to this email saying I'm interested"*
4.  **Apply**: Press **Enter** to generate the result. The overlay shows a preview. Press **Enter** again to replace your selected text with the AI output.

### Technical Details
*   **Model**: Microsoft **Phi-3 Mini 4k Instruct** (Quantized to Q4_K_M GGUF).
*   **Engine**: `llama.cpp` via Python bindings.
*   **Hardware**: Runs entirely on CPU. Requires ~2.5GB RAM when active.
*   **Privacy**: No text ever leaves your machine.

## 2. Chameleon Mode (Context Awareness)

Chameleon Mode makes SONU aware of *where* you are typing, automatically adjusting its behavior to match the context.

### Capabilities
*   **Coding Apps (VS Code, IntelliJ)**:
    *   Preserves `snake_case` and `camelCase`.
    *   Reduces aggressive punctuation normalization.
    *   Prevents "smart" capitalization of variable names.
*   **Chat Apps (Discord, Slack)**:
    *   Allows more casual phrasing.
    *   Supports emoji expansion.
*   **Writing Apps (Word, Obsidian)**:
    *   Enforces strict grammar and capitalization.
    *   Uses "Formal" style profile by default.

### enabling
Go to **Settings > AI & Intelligence** and toggle **"Chameleon Mode"** on.

## 3. Setup & Requirements

### System Requirements
*   **RAM**: Minimum 8GB (16GB recommended for smooth multitasking).
*   **Disk**: ~2.5GB additional free space for the LLM model.
*   **CPU**: Any modern multi-core processor (AVX2 support required, which is standard on CPUs since ~2013).

### Installation
1.  Open **Settings > AI & Intelligence**.
2.  Click **"Download Model"** under the Local LLM section.
3.  Wait for the download to complete (progress bar shown).
4.  Once "Installed", the features are ready to use.

## Troubleshooting

*   **Overlay doesn't appear**: Ensure `Ctrl+Win+E` isn't conflicting with another app. You can change this in Settings.
*   **Model download fails**: Check your internet connection. Resume is supported if interrupted.
*   **Slow generation**: Local LLMs depend on CPU speed. On older laptops, generation might take 2-5 seconds.
