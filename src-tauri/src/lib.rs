use std::net::TcpStream;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;

use tauri::{Manager, Window};
use tauri_plugin_shell::ShellExt;

static SERVER_STARTED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn get_microphones() -> Vec<String> {
    vec!["Default Microphone".to_string()]
}

#[tauri::command]
fn get_audio_devices() -> Vec<String> {
    vec!["Default Output".to_string(), "Default Input".to_string()]
}

#[tauri::command]
fn set_fullscreen(window: Window, fullscreen: bool) {
    let _ = window.set_fullscreen(fullscreen);
}

#[tauri::command]
fn get_system_info() -> String {
    format!("{} {}", std::env::consts::OS, std::env::consts::ARCH)
}

#[tauri::command]
fn is_server_ready() -> bool {
    SERVER_STARTED.load(Ordering::SeqCst)
}

fn check_server_running() -> bool {
    TcpStream::connect("127.0.0.1:3000").is_ok()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_microphones,
            get_audio_devices,
            set_fullscreen,
            get_system_info,
            is_server_ready,
        ])
        .setup(|app| {
            // Check if server is already running
            if check_server_running() {
                SERVER_STARTED.store(true, Ordering::SeqCst);
                return Ok(());
            }
            
            // Start Next.js server in background
            let shell = app.shell();
            let current_dir = std::env::current_dir().unwrap_or_default();
            
            // Try bun first, then npm
            let spawn_result = shell
                .command("bun")
                .args(["run", "dev"])
                .current_dir(current_dir.clone())
                .spawn();
            
            if spawn_result.is_err() {
                // Fallback to npm
                let _ = shell
                    .command("npm")
                    .args(["run", "dev"])
                    .current_dir(current_dir)
                    .spawn();
            }
            
            // Wait for server to be ready, then redirect
            let handle = app.handle().clone();
            thread::spawn(move || {
                let mut attempts = 0;
                loop {
                    if check_server_running() {
                        SERVER_STARTED.store(true, Ordering::SeqCst);
                        
                        // Give server a moment to fully initialize
                        thread::sleep(Duration::from_millis(500));
                        
                        // Redirect window to Next.js app
                        if let Some(window) = handle.get_webview_window("main") {
                            let _ = window.eval("window.location.href = 'http://localhost:3000'");
                        }
                        break;
                    }
                    
                    attempts += 1;
                    // Timeout after 60 seconds
                    if attempts > 120 {
                        eprintln!("Timeout waiting for Next.js server to start");
                        break;
                    }
                    
                    thread::sleep(Duration::from_millis(500));
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
