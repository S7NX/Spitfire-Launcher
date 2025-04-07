use tauri::{Manager, generate_handler};
use sysinfo::System;

#[tauri::command]
fn get_processes() -> Vec<String> {
    let mut system = System::new_all();
    system.refresh_all();

    system
        .processes()
        .iter()
        .map(|(_pid, process)| {
            format!("{} - {}", process.pid(), process.name().to_string_lossy())
        })
        .collect()
}

pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }));
    }

    builder
        .invoke_handler(generate_handler![get_processes])
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
