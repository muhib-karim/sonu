use log::debug;
use serde::Serialize;
use specta::Type;

use crate::settings::AppSettings;

#[derive(Debug, Clone, Serialize, Type)]
pub struct ActiveAppInfo {
    pub app_name: String,
    pub window_title: String,
}

/// Returns information about the currently focused application window.
/// Only implemented on Windows for now; other platforms return `None` and
/// context-aware features degrade gracefully to plain post-processing.
pub fn get_active_app() -> Option<ActiveAppInfo> {
    #[cfg(target_os = "windows")]
    {
        get_active_app_windows()
    }

    #[cfg(not(target_os = "windows"))]
    {
        None
    }
}

#[cfg(target_os = "windows")]
fn get_active_app_windows() -> Option<ActiveAppInfo> {
    use std::path::Path;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
        PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW, GetWindowThreadProcessId,
    };

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.0.is_null() {
            return None;
        }

        let title_len = GetWindowTextLengthW(hwnd);
        let window_title = if title_len > 0 {
            let mut buf = vec![0u16; title_len as usize + 1];
            let copied = GetWindowTextW(hwnd, &mut buf);
            if copied > 0 {
                String::from_utf16_lossy(&buf[..copied as usize])
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == 0 {
            return None;
        }

        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
        let result = (|| {
            let mut path_buf = [0u16; 1024];
            let mut size = path_buf.len() as u32;
            QueryFullProcessImageNameW(
                handle,
                PROCESS_NAME_WIN32,
                windows::core::PWSTR(path_buf.as_mut_ptr()),
                &mut size,
            )
            .ok()?;
            let exe = String::from_utf16_lossy(&path_buf[..size as usize]);
            let app_name = Path::new(&exe)
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();
            if app_name.is_empty() {
                None
            } else {
                Some(ActiveAppInfo {
                    app_name,
                    window_title,
                })
            }
        })();

        let _ = CloseHandle(handle);
        result
    }
}

/// Maps a process name to one of the four style categories used by the
/// Style settings (personal / work / email / other).
pub fn style_category_for_app(app_name: &str) -> &'static str {
    let name = app_name.to_lowercase();

    const WORK_CHAT: &[&str] = &["slack", "teams", "zoom", "skype", "meet", "webex"];
    const PERSONAL_CHAT: &[&str] = &[
        "discord",
        "whatsapp",
        "telegram",
        "signal",
        "messenger",
        "wechat",
        "viber",
        "line",
        "imessage",
        "messages",
    ];
    const EMAIL: &[&str] = &["outlook", "thunderbird", "mail", "notion"];

    if WORK_CHAT.iter().any(|k| name.contains(k)) {
        "work"
    } else if PERSONAL_CHAT.iter().any(|k| name.contains(k)) {
        "personal"
    } else if EMAIL.iter().any(|k| name.contains(k)) {
        "email"
    } else {
        "other"
    }
}

fn default_style_for_category(category: &str) -> &'static str {
    match category {
        "personal" => "casual",
        "work" => "professional",
        "email" => "formal",
        _ => "neutral",
    }
}

fn style_instruction(style_id: &str) -> &'static str {
    match style_id {
        "casual" => "Use a relaxed, informal tone.",
        "friendly" => "Use a warm, approachable tone.",
        "brief" => "Keep the text short and to the point.",
        "professional" => "Use a formal business tone.",
        "direct" => "Be clear and actionable.",
        "collaborative" => "Use team-focused, collaborative language.",
        "formal" => "Use traditional formal email formatting.",
        "concise" => "Get to the point quickly.",
        "warm" => "Be personable yet professional.",
        "technical" => "Be precise and detailed.",
        "creative" => "Use expressive, creative language.",
        _ => "Do not apply any specific style; transcribe faithfully.",
    }
}

/// Builds the additional context instruction appended to LLM post-processing
/// prompts, based on the currently focused application and the user's style
/// selection. Returns `None` when context awareness is disabled, no window
/// information is available, or nothing meaningful can be added.
pub fn build_context_hint(settings: &AppSettings) -> Option<String> {
    if !settings.context_awareness_enabled {
        return None;
    }

    let app = get_active_app()?;
    let category = style_category_for_app(&app.app_name);
    let style_id = settings
        .style_selection
        .get(category)
        .map(|s| s.as_str())
        .unwrap_or_else(|| default_style_for_category(category));

    let hint = format!(
        "The user is dictating into the application '{}' (category: {}). Preserve the meaning of the transcription exactly. {}",
        app.app_name, category, style_instruction(style_id)
    );

    debug!("Context hint: {}", hint);
    Some(hint)
}
