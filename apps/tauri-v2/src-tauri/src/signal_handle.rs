// Everything in this module is Unix-only (it exists to service SIGUSR2). Gate
// the imports to match, otherwise Windows builds report them as unused.
#[cfg(unix)]
use crate::actions::ACTION_MAP;
#[cfg(unix)]
use crate::ManagedToggleState;
#[cfg(unix)]
use log::{debug, info, warn};
#[cfg(unix)]
use std::thread;
#[cfg(unix)]
use tauri::{AppHandle, Manager};

#[cfg(unix)]
use signal_hook::consts::SIGUSR2;
#[cfg(unix)]
use signal_hook::iterator::Signals;

#[cfg(unix)]
pub fn setup_signal_handler(app_handle: AppHandle, mut signals: Signals) {
    let app_handle_for_signal = app_handle.clone();

    debug!("SIGUSR2 signal handler registered successfully");
    thread::spawn(move || {
        debug!("SIGUSR2 signal handler thread started");
        for sig in signals.forever() {
            match sig {
                SIGUSR2 => {
                    debug!("Received SIGUSR2 signal (signal number: {sig})");

                    let binding_id = "transcribe";
                    let shortcut_string = "SIGUSR2";

                    if let Some(action) = ACTION_MAP.get(binding_id) {
                        // Determine action and update state while holding the lock,
                        // but RELEASE the lock before calling the action to avoid deadlocks.
                        // (Actions may need to acquire the lock themselves, e.g., cancel_current_operation)
                        let should_start: bool;
                        {
                            let toggle_state_manager =
                                app_handle_for_signal.state::<ManagedToggleState>();

                            let mut states = match toggle_state_manager.lock() {
                                Ok(s) => s,
                                Err(e) => {
                                    warn!("Failed to lock toggle state manager: {e}");
                                    continue;
                                }
                            };

                            let is_currently_active = states
                                .active_toggles
                                .entry(binding_id.to_string())
                                .or_insert(false);

                            should_start = !*is_currently_active;
                        } // Lock released here

                        // Now call the action without holding the lock
                        if should_start {
                            debug!("SIGUSR2: Starting transcription (was inactive)");
                            // Only latch the toggle if the action actually
                            // started, matching the shortcut handler.
                            let started =
                                action.start(&app_handle_for_signal, binding_id, shortcut_string);
                            if started {
                                info!("SIGUSR2: Transcription started");
                                if let Ok(mut states) =
                                    app_handle_for_signal.state::<ManagedToggleState>().lock()
                                {
                                    states.active_toggles.insert(binding_id.to_string(), true);
                                }
                            } else {
                                warn!("SIGUSR2: Transcription failed to start");
                            }
                        } else {
                            debug!("SIGUSR2: Stopping transcription (was active)");
                            action.stop(&app_handle_for_signal, binding_id, shortcut_string);
                            if let Ok(mut states) =
                                app_handle_for_signal.state::<ManagedToggleState>().lock()
                            {
                                states.active_toggles.insert(binding_id.to_string(), false);
                            }
                            debug!("SIGUSR2: Transcription stopped");
                        }
                    } else {
                        warn!("No action defined in ACTION_MAP for binding ID '{binding_id}'");
                    }
                }
                other => {
                    // Was `unreachable!()`, which would abort the process
                    // (`panic = "abort"`) if the signal set ever changes.
                    warn!("Ignoring unexpected signal: {other}");
                }
            }
        }
    });
}
