use sysinfo::{System, ProcessesToUpdate, ProcessRefreshKind};
use tauri::{generate_handler, Manager};

#[tauri::command]
fn get_processes() -> Vec<String> {
    let mut system = System::new_all();
    system.refresh_processes_specifics(ProcessesToUpdate::All, true, ProcessRefreshKind::nothing());

    system
        .processes()
        .iter()
        .map(|(pid, process)| format!("{} - {}", pid, process.name().to_string_lossy()))
        .collect()
}

#[tauri::command]
fn get_locale() -> String {
    sys_locale::get_locale()
        .and_then(|locale| locale.split(['_', '-']).next().map(|s| s.to_string()))
        .unwrap_or_else(|| "en".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
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
        .invoke_handler(generate_handler![get_processes,get_locale])
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_websocket::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
