mod db;
mod models;
mod commands;

use commands::*;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Markidown backend is alive.")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            workspace_init,
            note_list,
            note_create,
            note_read,
            note_update,
            note_delete,
            note_toggle_star
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
