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
                if let Some(window) = app.handle().get_webview_window("main") {
                    let _ = window.eval("window.location.href = 'http://localhost:3000'");
                }
                return Ok(());
            }
            
            let handle = app.handle().clone();
            
            // Start the bundled server in background
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(500));
                
                // Get resource directory
                let resource_dir = handle.path().resource_dir().unwrap_or_else(|_| env::current_dir().unwrap_or_default());
                
                println!("Resource directory: {:?}", resource_dir);
                
                // Path to bundled Node.js
                let node_path = resource_dir.join("node").join(if cfg!(windows) { "node.exe" } else { "node" });
                
                // Path to server
                let server_path = resource_dir.join("server").join("server.js");
                
                println!("Node path: {:?}", node_path);
                println!("Server path: {:?}", server_path);
                
                let mut server_started = false;
                
                // Try bundled Node.js first
                if node_path.exists() && server_path.exists() {
                    println!("Starting bundled server...");
                    
                    let result = Command::new(&node_path)
                        .arg(&server_path)
                        .current_dir(server_path.parent().unwrap())
                        .env("PORT", "3000")
                        .env("HOSTNAME", "0.0.0.0")
                        .spawn();
                    
                    if let Ok(child) = result {
                        unsafe { SERVER_PROCESS = Some(child); }
                        server_started = true;
                    }
                }
                
                // Fallback: Try system Node.js
                if !server_started {
                    println!("Trying system Node.js...");
                    
                    // Try bundled server with system node
                    if server_path.exists() {
                        let result = Command::new("node")
                            .arg(&server_path)
                            .current_dir(server_path.parent().unwrap())
                            .env("PORT", "3000")
                            .spawn();
                        
                        if let Ok(child) = result {
                            unsafe { SERVER_PROCESS = Some(child); }
                            server_started = true;
                        }
                    }
                }
                
                // Fallback: Try bun/npm run dev
                if !server_started {
                    let current_dir = env::current_dir().unwrap_or_default();
                    
                    // Check for package.json
                    if current_dir.join("package.json").exists() {
                        let result = Command::new("bun")
                            .args(["run", "dev"])
                            .current_dir(&current_dir)
                            .spawn()
                            .or_else(|_| Command::new("npm")
                                .args(["run", "dev"])
                                .current_dir(&current_dir)
                                .spawn());
                        
                        if let Ok(child) = result {
                            unsafe { SERVER_PROCESS = Some(child); }
                            server_started = true;
                        }
                    }
                }
                
                // Wait for server to be ready
                if server_started {
                    let mut attempts = 0;
                    loop {
                        if check_server_running() {
                            SERVER_STARTED.store(true, Ordering::SeqCst);
                            println!("Server is ready!");
                            
                            if let Some(window) = handle.get_webview_window("main") {
                                let _ = window.eval("window.location.href = 'http://localhost:3000'");
                            }
                            break;
                        }
                        
                        attempts += 1;
                        if attempts > 120 {
                            println!("Server startup timeout");
                            break;
                        }
                        thread::sleep(Duration::from_millis(500));
                    }
                }
            });
            
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
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
