use std::net::TcpStream;
use std::process::{Command, Child};
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use std::env;
use std::path::PathBuf;
use std::fs;

use tauri::Manager;
use serde::{Deserialize, Serialize};

mod audio;

// ============================================================
// Custom Tauri Commands — bypass plugin ACL restrictions
// In Tauri v2, custom #[tauri::command] functions are allowed
// by default without ACL configuration. We use these as reliable
// fallbacks for file system and dialog operations.
// ============================================================

/// Read a file as raw bytes (for audio, video, images).
/// Returns base64-encoded string to avoid IPC binary issues.
#[tauri::command]
fn native_read_file_bytes(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read '{}': {}", file_path, e))?;
    Ok(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes))
}

/// Read a file as text (for TXT, config files, etc.)
#[tauri::command]
fn native_read_file_text(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    fs::read_to_string(&path).map_err(|e| format!("Failed to read '{}': {}", file_path, e))
}

/// Check if a file or directory exists
#[tauri::command]
fn native_file_exists(file_path: String) -> bool {
    PathBuf::from(&file_path).exists()
}

/// List directory contents
#[derive(Serialize, Deserialize, Clone)]
struct NativeDirEntry {
    name: String,
    is_directory: bool,
    is_file: bool,
    path: String,
}

#[tauri::command]
fn native_read_dir(dir_path: String) -> Result<Vec<NativeDirEntry>, String> {
    let path = PathBuf::from(&dir_path);
    if !path.exists() {
        return Err(format!("Directory not found: {}", dir_path));
    }
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }

    let entries = fs::read_dir(&path)
        .map_err(|e| format!("Failed to read directory '{}': {}", dir_path, e))?;

    let mut result = Vec::new();
    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry_path.to_string_lossy().to_string();
        result.push(NativeDirEntry {
            name,
            is_directory: entry_path.is_dir(),
            is_file: entry_path.is_file(),
            path: full_path,
        });
    }

    Ok(result)
}

/// Open a native folder picker dialog.
/// Uses rfd (Rust File Dialog) crate for reliable cross-platform support.
#[tauri::command]
fn native_pick_folder(title: String) -> Option<String> {
    rfd::FileDialog::new()
        .set_title(&title)
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

/// Open a native file dialog for opening/picking an existing file.
/// Uses rfd (Rust File Dialog) crate for reliable cross-platform support.
#[tauri::command]
fn native_pick_file_open(title: String, filter_name: String, extensions: Vec<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new().set_title(&title);
    if !extensions.is_empty() {
        dialog = dialog.add_filter(
            &filter_name,
            &extensions.iter().map(|s| s.as_str()).collect::<Vec<&str>>(),
        );
    }
    dialog.pick_file().map(|p| p.to_string_lossy().to_string())
}

/// Open a native file dialog for saving.
#[tauri::command]
fn native_pick_file_save(title: String, filter_name: String, extensions: Vec<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new().set_title(&title);
    if !extensions.is_empty() {
        dialog = dialog.add_filter(
            &filter_name,
            &extensions.iter().map(|s| s.as_str()).collect::<Vec<&str>>(),
        );
    }
    dialog.save_file().map(|p| p.to_string_lossy().to_string())
}

/// Show a native message dialog.
#[tauri::command]
fn native_message(title: String, message: String, kind: String) -> bool {
    match kind.as_str() {
        "info" => rfd::MessageDialog::new()
            .set_title(&title)
            .set_description(&message)
            .set_level(rfd::MessageLevel::Info)
            .show(),
        "warning" => rfd::MessageDialog::new()
            .set_title(&title)
            .set_description(&message)
            .set_level(rfd::MessageLevel::Warning)
            .show(),
        "error" => rfd::MessageDialog::new()
            .set_title(&title)
            .set_description(&message)
            .set_level(rfd::MessageLevel::Error)
            .show(),
        _ => rfd::MessageDialog::new()
            .set_title(&title)
            .set_description(&message)
            .set_level(rfd::MessageLevel::Info)
            .show(),
    };
    true
}

/// Show a native confirm dialog.
#[tauri::command]
fn native_confirm(title: String, message: String) -> bool {
    matches!(
        rfd::MessageDialog::new()
            .set_title(&title)
            .set_description(&message)
            .set_buttons(rfd::MessageButtons::YesNo)
            .show(),
        rfd::MessageDialogResult::Yes
    )
}

/// Create a directory (recursive)
#[tauri::command]
fn native_mkdir(dir_path: String) -> Result<(), String> {
    fs::create_dir_all(&dir_path)
        .map_err(|e| format!("Failed to create directory '{}': {}", dir_path, e))
}

/// Write bytes to a file (decoded from base64)
#[tauri::command]
fn native_write_file_bytes(file_path: String, data_base64: String) -> Result<(), String> {
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &data_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    if let Some(parent) = PathBuf::from(&file_path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(&file_path, &bytes)
        .map_err(|e| format!("Failed to write '{}': {}", file_path, e))
}

/// Write text to a file
#[tauri::command]
fn native_write_file_text(file_path: String, content: String) -> Result<(), String> {
    if let Some(parent) = PathBuf::from(&file_path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    fs::write(&file_path, &content)
        .map_err(|e| format!("Failed to write '{}': {}", file_path, e))
}

/// Remove a file
#[tauri::command]
fn native_remove_file(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to remove '{}': {}", file_path, e))
}

/// Remove a directory (recursive)
#[tauri::command]
fn native_remove_dir(dir_path: String) -> Result<(), String> {
    fs::remove_dir_all(&dir_path)
        .map_err(|e| format!("Failed to remove directory '{}': {}", dir_path, e))
}

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
        .invoke_handler(tauri::generate_handler![
            // Native file system commands (bypass ACL)
            native_read_file_bytes,
            native_read_file_text,
            native_file_exists,
            native_read_dir,
            native_mkdir,
            native_write_file_bytes,
            native_write_file_text,
            native_remove_file,
            native_remove_dir,
            // Native dialog commands (bypass ACL)
            native_pick_folder,
            native_pick_file_open,
            native_pick_file_save,
            native_message,
            native_confirm,
            // Native audio commands (ASIO / WASAPI)
            audio::commands::audio_list_devices,
            audio::commands::audio_get_default_device,
            audio::commands::audio_play_file,
            audio::commands::audio_pause,
            audio::commands::audio_resume,
            audio::commands::audio_seek,
            audio::commands::audio_set_volume,
            audio::commands::audio_stop,
            audio::commands::audio_get_position,
            audio::commands::audio_get_state,
            // Audio analysis commands (pitch detection, BPM estimation)
            audio::analysis_commands::audio_analyze_pitch,
            audio::analysis_commands::audio_detect_bpm,
            audio::analysis_commands::audio_crepe_info,
        ])
        .setup(|app| {
            // Register the audio state (needs AppHandle for the dedicated audio thread)
            app.manage(audio::commands::AudioState::new(app.handle().clone()));
            // Register the analysis state (needs AppHandle for the dedicated analysis thread)
            app.manage(audio::analysis_commands::AnalysisState::new(app.handle().clone()));

            // Get the main window and open DevTools in debug mode
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.handle().get_webview_window("main") {
                    // Open DevTools automatically in debug mode
                    window.open_devtools();
                }
            }
            
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
