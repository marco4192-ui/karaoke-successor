use std::net::TcpStream;
use std::process::{Command, Child};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use std::env;
use std::path::PathBuf;

use tauri::{Manager, Window};

static SERVER_STARTED: AtomicBool = AtomicBool::new(false);
static mut SERVER_PROCESS: Option<Child> = None;

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

fn get_resource_path(app_handle: &tauri::AppHandle, path: &str) -> PathBuf {
    // Try resource directory first (for bundled app)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let full_path = resource_dir.join(path);
        if full_path.exists() {
            return full_path;
        }
    }
    
    // Fallback to current directory
    env::current_dir().unwrap_or_default().join(path)
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
                
                // Redirect immediately
                if let Some(window) = app.handle().get_webview_window("main") {
                    let _ = window.eval("window.location.href = 'http://localhost:3000'");
                }
                return Ok(());
            }
            
            // Get the path to the standalone server
            let handle = app.handle().clone();
            
            // Start Next.js standalone server in background
            thread::spawn(move || {
                // Wait a bit for the window to load
                thread::sleep(Duration::from_millis(500));
                
                // Try to find and start the server
                let server_paths = vec![
                    get_resource_path(&handle, "server/server.js"),
                    get_resource_path(&handle, ".next/standalone/server.js"),
                ];
                
                for server_path in server_paths {
                    if server_path.exists() {
                        println!("Found server at: {:?}", server_path);
                        
                        // Start Node.js server
                        let result = Command::new("node")
                            .arg(&server_path)
                            .current_dir(server_path.parent().unwrap_or(&PathBuf::from(".")))
                            .spawn();
                        
                        if let Ok(child) = result {
                            unsafe { SERVER_PROCESS = Some(child); }
                            
                            // Wait for server to be ready
                            let mut attempts = 0;
                            loop {
                                if check_server_running() {
                                    SERVER_STARTED.store(true, Ordering::SeqCst);
                                    
                                    // Redirect window to Next.js app
                                    if let Some(window) = handle.get_webview_window("main") {
                                        let _ = window.eval("window.location.href = 'http://localhost:3000'");
                                    }
                                    break;
                                }
                                
                                attempts += 1;
                                if attempts > 60 {
                                    break;
                                }
                                thread::sleep(Duration::from_millis(500));
                            }
                            return;
                        }
                    }
                }
                
                // If we get here, server couldn't be started
                // Try bun/npm as fallback
                let fallback_result = Command::new("bun")
                    .args(["run", "dev"])
                    .spawn()
                    .or_else(|_| Command::new("npm")
                        .args(["run", "dev"])
                        .spawn());
                
                if let Ok(child) = fallback_result {
                    unsafe { SERVER_PROCESS = Some(child); }
                    
                    let mut attempts = 0;
                    loop {
                        if check_server_running() {
                            SERVER_STARTED.store(true, Ordering::SeqCst);
                            
                            if let Some(window) = handle.get_webview_window("main") {
                                let _ = window.eval("window.location.href = 'http://localhost:3000'");
                            }
                            break;
                        }
                        
                        attempts += 1;
                        if attempts > 120 {
                            break;
                        }
                        thread::sleep(Duration::from_millis(500));
                    }
                }
            });
            
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill the server process when window is closed
                unsafe {
                    if let Some(ref mut child) = SERVER_PROCESS {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
