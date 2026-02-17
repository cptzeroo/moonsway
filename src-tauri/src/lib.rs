use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;

struct PocketBaseState {
    child: Option<tauri_plugin_shell::process::CommandChild>,
}

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! Welcome to Moonsway.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Mutex::new(PocketBaseState { child: None }))
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");

            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app data dir");

            let data_dir = app_data_dir.to_string_lossy().to_string();

            let sidecar_command = app
                .shell()
                .sidecar("pocketbase")
                .expect("failed to create sidecar command")
                .args(["serve", "--http", "127.0.0.1:8090", "--dir", &data_dir]);

            let (mut rx, child) = sidecar_command
                .spawn()
                .expect("failed to spawn PocketBase sidecar");

            // Store child process so we can kill it on exit
            let state = app.state::<Mutex<PocketBaseState>>();
            state.lock().unwrap().child = Some(child);

            // Log PocketBase output in dev
            tauri::async_runtime::spawn(async move {
                use tauri_plugin_shell::process::CommandEvent;
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            println!("[PocketBase] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Stderr(line) => {
                            eprintln!("[PocketBase] {}", String::from_utf8_lossy(&line));
                        }
                        CommandEvent::Terminated(status) => {
                            println!("[PocketBase] terminated with {:?}", status);
                            break;
                        }
                        _ => {}
                    }
                }
            });

            println!("[Moonsway] PocketBase sidecar started on 127.0.0.1:8090");
            println!("[Moonsway] Data dir: {}", data_dir);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state = window.state::<Mutex<PocketBaseState>>();
                if let Some(child) = state.lock().unwrap().child.take() {
                    let _ = child.kill();
                    println!("[Moonsway] PocketBase sidecar stopped");
                }
            }
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
