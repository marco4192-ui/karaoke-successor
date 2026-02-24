use tauri::Manager;

#[tauri::command]
fn get_microphones() -> Vec<String> {
    // List available microphones - this would integrate with system audio APIs
    vec!["Default Microphone".to_string()]
}

#[tauri::command]
fn get_audio_devices() -> Vec<String> {
    // List all audio devices
    vec!["Default Output".to_string(), "Default Input".to_string()]
}

#[tauri::command]
fn set_fullscreen(window: tauri::Window, fullscreen: bool) {
    let _ = window.set_fullscreen(Some(fullscreen));
}

#[tauri::command]
fn get_system_info() -> String {
    format!("{} {}", std::env::consts::OS, std::env::consts::ARCH)
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_microphones,
            get_audio_devices,
            set_fullscreen,
            get_system_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
