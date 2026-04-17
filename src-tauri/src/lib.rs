mod commands;
mod midi;

use tauri::{Emitter, Manager};
use std::sync::Mutex;

/// Holds the path of a file requested before the frontend was ready to receive events.
#[derive(Default)]
struct PendingOpen(Mutex<Option<String>>);

#[tauri::command]
fn take_pending_open(state: tauri::State<PendingOpen>) -> Option<String> {
    state.0.lock().ok().and_then(|mut g| g.take())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .manage(PendingOpen::default())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            // Handle file path passed as CLI arg (Windows/Linux double-click).
            #[cfg(not(target_os = "macos"))]
            {
                let args: Vec<String> = std::env::args().collect();
                if let Some(path) = args.iter().skip(1).find(|a| !a.starts_with("--")) {
                    if let Some(state) = app.try_state::<PendingOpen>() {
                        if let Ok(mut g) = state.0.lock() {
                            *g = Some(path.clone());
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_file,
            commands::load_file,
            take_pending_open,
            midi::midi_list_inputs,
            midi::midi_connect,
            midi::midi_disconnect,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, _event| {
            // macOS: handle file-open events (double-click .musicxml in Finder)
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &_event {
                for url in urls {
                    let path = url.to_file_path().ok()
                        .and_then(|p| p.to_str().map(|s| s.to_string()))
                        .unwrap_or_else(|| url.to_string());

                    let emitted = _app_handle.emit("nubium://file-opened", path.clone()).is_ok();
                    if !emitted {
                        if let Some(state) = _app_handle.try_state::<PendingOpen>() {
                            if let Ok(mut g) = state.0.lock() {
                                *g = Some(path);
                            }
                        }
                    } else if let Some(state) = _app_handle.try_state::<PendingOpen>() {
                        if let Ok(mut g) = state.0.lock() {
                            *g = Some(path);
                        }
                    }
                }
            }
        });
}
