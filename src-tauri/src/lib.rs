use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;
use std::net::TcpListener;
use log::{info, warn, error, debug};

struct PocketBaseState {
    child: Option<tauri_plugin_shell::process::CommandChild>,
}

fn is_port_available(port: u16) -> bool {
    let available = TcpListener::bind(("127.0.0.1", port)).is_ok();
    debug!("Port {} availability check: {}", port, available);
    available
}

#[tauri::command]
fn greet(name: String) -> String {
    debug!("Greet command called with name: {}", name);
    format!("Hello, {}! Welcome to Moonsway.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger (only in debug builds)
    #[cfg(debug_assertions)]
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    
    info!("Moonsway starting up...");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(PocketBaseState { child: None }))
        .setup(|app| {
            info!("Running setup hook...");
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            info!("App data directory: {:?}", app_data_dir);

            if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
                error!("Failed to create app data dir: {}", e);
                return Err(e.into());
            }

            let data_dir = app_data_dir.to_string_lossy().to_string();
            info!("PocketBase data directory: {}", data_dir);

            if !is_port_available(8090) {
                warn!("Port 8090 already in use - PocketBase may already be running");
                info!("Skipping PocketBase sidecar spawn");
            } else {
                info!("Starting PocketBase sidecar on 127.0.0.1:8090...");
                let sidecar_command = app
                    .shell()
                    .sidecar("pocketbase")
                    .expect("failed to create sidecar command")
                    .args(["serve", "--http", "127.0.0.1:8090", "--dir", &data_dir]);

                let (mut rx, child) = match sidecar_command.spawn() {
                    Ok(result) => result,
                    Err(e) => {
                        error!("Failed to spawn PocketBase sidecar: {}", e);
                        return Err(e.into());
                    }
                };

                info!("PocketBase sidecar spawned successfully");

                // Store child process so we can kill it on exit
                let state = app.state::<Mutex<PocketBaseState>>();
                state.lock().unwrap().child = Some(child);
                debug!("PocketBase child process stored in state");

                // Log PocketBase output
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_shell::process::CommandEvent;
                    while let Some(event) = rx.recv().await {
                        match event {
                            CommandEvent::Stdout(line) => {
                                let output = String::from_utf8_lossy(&line);
                                info!("[PocketBase] {}", output.trim());
                            }
                            CommandEvent::Stderr(line) => {
                                let output = String::from_utf8_lossy(&line);
                                if output.contains("Error") || output.contains("error") {
                                    error!("[PocketBase] {}", output.trim());
                                } else {
                                    warn!("[PocketBase] {}", output.trim());
                                }
                            }
                            CommandEvent::Terminated(status) => {
                                if let Some(code) = status.code {
                                    if code == 0 {
                                        info!("[PocketBase] Process terminated cleanly (exit code: 0)");
                                    } else {
                                        error!("[PocketBase] Process terminated with error (exit code: {})", code);
                                    }
                                } else {
                                    warn!("[PocketBase] Process terminated (no exit code)");
                                }
                                break;
                            }
                            CommandEvent::Error(err) => {
                                error!("[PocketBase] Process error: {}", err);
                            }
                            _ => {}
                        }
                    }
                });

                info!("PocketBase sidecar ready on http://127.0.0.1:8090");
            }
            
            info!("Setup completed successfully");

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                info!("Window destroyed - cleaning up PocketBase sidecar...");
                let state = window.state::<Mutex<PocketBaseState>>();
                if let Some(child) = state.lock().unwrap().child.take() {
                    match child.kill() {
                        Ok(_) => info!("PocketBase sidecar stopped successfully"),
                        Err(e) => error!("Failed to stop PocketBase sidecar: {}", e),
                    }
                } else {
                    debug!("No PocketBase child process to clean up");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
    info!("Moonsway shutting down...");
}
