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
                
                // Get resource directory (where bundled files are)
                let resource_dir = handle.path().resource_dir();
                println!("Resource dir: {:?}", resource_dir);
                
                let mut node_path: Option<PathBuf> = None;
                let mut server_path: Option<PathBuf> = None;
                
                // Look for bundled Node.js
                if let Ok(ref res_dir) = resource_dir {
                    let bundled_node = res_dir.join("bundled").join("node").join(if cfg!(windows) { "node.exe" } else { "node" });
                    if bundled_node.exists() {
                        println!("Found bundled Node.js at: {:?}", bundled_node);
                        node_path = Some(bundled_node);
                    }
                }
                
                // Look for bundled server
                if let Ok(ref res_dir) = resource_dir {
                    let bundled_server = res_dir.join("bundled").join("server").join("server.js");
                    if bundled_server.exists() {
                        println!("Found bundled server at: {:?}", bundled_server);
                        server_path = Some(bundled_server);
                    }
                }
                
                // Also check next to executable
                if node_path.is_none() {
                    if let Ok(exe_path) = env::current_exe() {
                        if let Some(exe_dir) = exe_path.parent() {
                            let node_exe = exe_dir.join("bundled").join("node").join(if cfg!(windows) { "node.exe" } else { "node" });
                            if node_exe.exists() {
                                println!("Found Node.js next to exe: {:?}", node_exe);
                                node_path = Some(node_exe);
                            }
                        }
                    }
                }
                
                if server_path.is_none() {
                    if let Ok(exe_path) = env::current_exe() {
                        if let Some(exe_dir) = exe_path.parent() {
                            let server_exe = exe_dir.join("bundled").join("server").join("server.js");
                            if server_exe.exists() {
                                println!("Found server next to exe: {:?}", server_exe);
                                server_path = Some(server_exe);
                            }
                        }
                    }
                }
                
                let mut server_started = false;
                
                // Try bundled Node.js + server
                if let (Some(node), Some(server)) = (&node_path, &server_path) {
                    println!("Starting bundled server with Node.js...");
                    println!("Node: {:?}", node);
                    println!("Server: {:?}", server);
                    
                    if let Ok(child) = Command::new(node)
                        .arg(server)
                        .current_dir(server.parent().unwrap())
                        .env("PORT", "3000")
                        .env("HOSTNAME", "0.0.0.0")
                        .spawn()
                    {
                        unsafe { SERVER_PROCESS = Some(child); }
                        server_started = true;
                    } else {
                        println!("Failed to start bundled server");
                    }
                }
                
                // Fallback: Try system Node.js with bundled server
                if !server_started {
                    if let Some(server) = &server_path {
                        println!("Trying system Node.js with bundled server...");
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
