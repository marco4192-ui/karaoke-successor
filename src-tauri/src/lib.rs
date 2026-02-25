use std::net::TcpStream;
use std::process::{Command, Child};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use std::env;
use std::path::PathBuf;

use tauri::Manager;

static SERVER_STARTED: AtomicBool = AtomicBool::new(false);
static mut SERVER_PROCESS: Option<Child> = None;

fn check_server_running() -> bool {
    TcpStream::connect("127.0.0.1:3000").is_ok()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
            
            // Start server in background
            thread::spawn(move || {
                thread::sleep(Duration::from_millis(500));
                
                // Try to find Node.js and server in various locations
                let possible_node_paths: Vec<PathBuf> = vec![
                    // Bundled portable node (from installer)
                    handle.path().resource_dir().map(|p| p.join("node").join("node.exe")).unwrap_or_default(),
                    handle.path().resource_dir().map(|p| p.join("portable-node").join("node.exe")).unwrap_or_default(),
                    // Next to executable
                    env::current_exe().map(|p| p.parent().unwrap().join("node").join("node.exe")).unwrap_or_default(),
                    env::current_exe().map(|p| p.parent().unwrap().join("portable-node").join("node.exe")).unwrap_or_default(),
                ];
                
                let possible_server_paths: Vec<PathBuf> = vec![
                    // Bundled server (from installer)
                    handle.path().resource_dir().map(|p| p.join("server").join("server.js")).unwrap_or_default(),
                    // Next to executable
                    env::current_exe().map(|p| p.parent().unwrap().join("server").join("server.js")).unwrap_or_default(),
                ];
                
                let mut node_path: Option<PathBuf> = None;
                let mut server_path: Option<PathBuf> = None;
                
                // Find Node.js
                for path in possible_node_paths {
                    if path.exists() {
                        println!("Found Node.js at: {:?}", path);
                        node_path = Some(path);
                        break;
                    }
                }
                
                // Find server
                for path in possible_server_paths {
                    if path.exists() {
                        println!("Found server at: {:?}", path);
                        server_path = Some(path);
                        break;
                    }
                }
                
                let mut server_started = false;
                
                // Try bundled Node.js + server
                if let (Some(node), Some(server)) = (&node_path, &server_path) {
                    println!("Starting bundled server with Node.js...");
                    
                    if let Ok(child) = Command::new(node)
                        .arg(server)
                        .current_dir(server.parent().unwrap())
                        .env("PORT", "3000")
                        .spawn()
                    {
                        unsafe { SERVER_PROCESS = Some(child); }
                        server_started = true;
                    }
                }
                
                // Fallback: Try system Node.js
                if !server_started {
                    if let Some(server) = &server_path {
                        println!("Trying system Node.js...");
                        if let Ok(child) = Command::new("node")
                            .arg(server)
                            .current_dir(server.parent().unwrap())
                            .env("PORT", "3000")
                            .spawn()
                        {
                            unsafe { SERVER_PROCESS = Some(child); }
                            server_started = true;
                        }
                    }
                }
                
                // Fallback: Try bun/npm in current directory
                if !server_started {
                    let current_dir = env::current_dir().unwrap_or_default();
                    if current_dir.join("package.json").exists() {
                        println!("Trying bun/npm run dev...");
                        
                        let result = Command::new("bun")
                            .args(["run", "dev"])
                            .current_dir(&current_dir)
                            .spawn()
                            .or_else(|_| {
                                Command::new("npm")
                                    .args(["run", "dev"])
                                    .current_dir(&current_dir)
                                    .spawn()
                            });
                        
                        if let Ok(child) = result {
                            unsafe { SERVER_PROCESS = Some(child); }
                            server_started = true;
                        }
                    }
                }
                
                // Wait for server to be ready
                if server_started {
                    println!("Waiting for server...");
                    for _ in 0..120 {
                        if check_server_running() {
                            SERVER_STARTED.store(true, Ordering::SeqCst);
                            println!("Server is ready!");
                            
                            if let Some(window) = handle.get_webview_window("main") {
                                let _ = window.eval("window.location.href = 'http://localhost:3000'");
                            }
                            return;
                        }
                        thread::sleep(Duration::from_millis(500));
                    }
                    println!("Server startup timeout");
                } else {
                    println!("Could not start server");
                }
            });
            
            Ok(())
        })
        .on_window_event(|window, event| {
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
