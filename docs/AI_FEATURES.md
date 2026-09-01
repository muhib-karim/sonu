# SONU AI Features

**Tauri v2 (2.3.0+)**

SONU's AI features enhance raw transcriptions without ever sending your audio
anywhere you haven't explicitly configured.

## 1. Context-Aware Dictation

SONU detects the application you're typing into and adapts the LLM
post-processing instructions accordingly.

### How it Works
1. You dictate as usual with the transcribe shortcut.
2. Before the transcription is enhanced, SONU looks up the focused
   application (process name + window title).
3. The app is mapped to one of four categories, and the style you picked for
   that category is injected into the LLM prompt:

   | Category | Example apps | Default style |
   |----------|-------------|---------------|
   | Personal messages | Discord, WhatsApp, Telegram | Casual |
   | Work messages | Slack, Teams, Zoom | Professional |
   | Email | Outlook, Thunderbird, Mail | Formal |
   | Everything else | Browsers, IDEs, editors | Neutral (faithful) |

4. The enhanced result keeps the meaning of your dictation, with a tone that
   fits where it's going.

### Configuration
- Toggle **Settings → Style → Context-Aware Dictation** (on by default).
- Pick a per-category style from the same page. Selections are persisted in
  the app settings store.
- Requires an LLM post-processing provider (cloud such as OpenAI/Groq, or a
  local GGUF model). Without one, dictation simply skips enhancement.

### Platform Support
Foreground-window detection is currently implemented on **Windows**. On
macOS and Linux the feature degrades gracefully — dictation works exactly as
before, just without the per-app context hint.

## 2. Command Mode

Select any text anywhere, press the Command Mode shortcut, and speak an
instruction — SONU rewrites the selected text with your configured LLM and
pastes it in place of the selection.

### How it Works
1. **Select text** in any application (browser, editor, email client…).
2. **Trigger** the Command Mode shortcut (default `Ctrl+Shift+E`,
   `Cmd+Shift+E` on macOS; configurable in **Settings → General**).
3. **Speak your instruction**, e.g.
   - "make this more concise"
   - "fix the grammar"
   - "translate this to German"
   - "reply saying I'm interested"
4. **Stop talking** (release the shortcut). SONU:
   - transcribes your instruction,
   - sends the selected text + instruction to the configured LLM,
   - pastes the rewritten text in place of the original selection.

### Fallbacks
- **No text selected?** Your dictation is typed as plain text instead.
- **No LLM configured?** The transcription is typed as-is.
- Your original clipboard content is restored after the selection capture,
  and again before the final paste.

## 3. Setup & Requirements

Both features reuse SONU's existing LLM post-processing pipeline:

1. Open **Settings → Post-Processing**.
2. Choose a provider — a cloud API (OpenAI, Groq, …) or a local GGUF model.
3. Enter the model name and API key (cloud providers).

Cloud providers are used only for the short text-enhancement request; audio
is transcribed locally unless you separately enable cloud transcription.
