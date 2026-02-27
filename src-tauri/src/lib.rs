use std::net::TcpStream;
use std::process::{Command, Child};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use std::env;
use std::path::PathBuf;
use std::fs;

use tauri::Manager;

static SERVER_STARTED: AtomicBool = AtomicBool::new(false);
static mut SERVER_PROCESS: Option<Child> = None;

fn check_server_running() -> bool {
    TcpStream::connect("127.0.0.1:3000").is_ok()
}

#[cfg(target_os = "windows")]
fn get_node_path(resource_dir: &PathBuf) -> Option<PathBuf> {
    // Windows: bundled/node/node.exe
    let bundled_node = resource_dir.join("bundled").join("node").join("node.exe");
    if bundled_node.exists() {
        println!("Found bundled Node.js at: {:?}", bundled_node);
        return Some(bundled_node);
    }
    None
}

#[cfg(target_os = "macos")]
fn get_node_path(resource_dir: &PathBuf) -> Option<PathBuf> {
    // macOS: bundled/node/bin/node
    let bundled_node = resource_dir.join("bundled").join("node").join("bin").join("node");
    if bundled_node.exists() {
        println!("Found bundled Node.js at: {:?}", bundled_node);
        return Some(bundled_node);
    }
    None
}

#[cfg(target_os = "linux")]
fn get_node_path(resource_dir: &PathBuf) -> Option<PathBuf> {
    // Linux: bundled/node/bin/node
    let bundled_node = resource_dir.join("bundled").join("node").join("bin").join("node");
    if bundled_node.exists() {
        println!("Found bundled Node.js at: {:?}", bundled_node);
        return Some(bundled_node);
    }
    None
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn get_node_path(_resource_dir: &PathBuf) -> Option<PathBuf> {
    None
}

fn get_server_path(resource_dir: &PathBuf) -> Option<PathBuf> {
    // Check for standalone server
    let possible_paths = [
        resource_dir.join("bundled").join("server").join("server.js"),
        resource_dir.join("bundled").join("server").join(".next").join("standalone").join("server.js"),
    ];
    
    for path in possible_paths {
        if path.exists() {
            println!("Found server at: {:?}", path);
            return Some(path);
        }
    }
    None
}

fn get_server_cwd(server_path: &PathBuf) -> PathBuf {
    // The working directory should be the server directory
    server_path.parent().unwrap_or(server_path).to_path_buf()
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Check if server is already running
            if check_server_running() {
                println!("Server already running on port 3000");
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
                
                // Get resource directory
                let resource_dir = handle.path().resource_dir();
                println!("Resource directory: {:?}", resource_dir);
                
                if let Err(ref e) = resource_dir {
                    println!("Error getting resource directory: {:?}", e);
                }
                
                let mut server_started = false;
                
                // Try bundled Node.js + server
                if let Ok(ref res_dir) = resource_dir {
                    let node_path = get_node_path(res_dir);
                    let server_path = get_server_path(res_dir);
                    
                    if let (Some(node), Some(server)) = (&node_path, &server_path) {
                        let cwd = get_server_cwd(server);
                        
                        println!("Starting bundled server...");
                        println!("Node: {:?}", node);
                        println!("Server: {:?}", server);
                        println!("Working dir: {:?}", cwd);
                        
                        // List files in cwd for debugging
                        if let Ok(entries) = fs::read_dir(&cwd) {
                            println!("Files in working directory:");
                            for entry in entries.flatten() {
                                println!("  - {:?}", entry.path());
                            }
                        }
                        
                        let result = Command::new(node)
                            .arg(server)
                            .current_dir(&cwd)
                            .env("PORT", "3000")
                            .env("HOSTNAME", "0.0.0.0")
                            .env("NODE_ENV", "production")
                            .spawn();
                        
                        match result {
                            Ok(child) => {
                                unsafe { SERVER_PROCESS = Some(child); }
                                server_started = true;
                                println!("Server process started successfully");
                            }
                            Err(e) => {
                                println!("Failed to start bundled server: {:?}", e);
                            }
                        }
                    } else {
                        println!("Could not find Node.js or server");
                        if node_path.is_none() {
                            println!("Node.js not found in bundled resources");
                        }
                        if server_path.is_none() {
                            println!("Server not found in bundled resources");
                        }
                    }
                }
                
                // Fallback: Try system Node.js
                if !server_started {
                    println!("Trying system Node.js...");
                    
                    // Try to find server.js in common locations
                    let cwd = env::current_dir().unwrap_or_default();
                    let possible_servers = [
                        cwd.join("server.js"),
                        cwd.join("bundled").join("server").join("server.js"),
                    ];
                    
                    for server in &possible_servers {
                        if server.exists() {
                            println!("Trying server at: {:?}", server);
                            if let Some(parent) = server.parent() {
                                if let Ok(child) = Command::new("node")
                                    .arg(server)
                                    .current_dir(parent)
                                    .env("PORT", "3000")
                                    .spawn()
                                {
                                    unsafe { SERVER_PROCESS = Some(child); }
                                    server_started = true;
                                    break;
                                }
                            }
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
                    println!("Waiting for server to be ready...");
                    for i in 0..120 {
                        if check_server_running() {
                            SERVER_STARTED.store(true, Ordering::SeqCst);
                            println!("Server is ready after {} attempts!", i);
                            
                            if let Some(window) = handle.get_webview_window("main") {
                                let _ = window.eval("window.location.href = 'http://localhost:3000'");
                            }
                            return;
                        }
                        thread::sleep(Duration::from_millis(500));
                    }
                    println!("Server startup timeout after 60 seconds");
                } else {
                    println!("Could not start server - no Node.js or bun found");
                }
            });
            
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                // Kill server process when window is closed
                unsafe {
                    if let Some(ref mut child) = SERVER_PROCESS {
                        let _ = child.kill();
                        println!("Server process killed");
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
