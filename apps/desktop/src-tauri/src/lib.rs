mod db;
mod models;
mod commands;
mod ai;

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
            note_get_all_tags,
            note_read,
            note_update,
            note_delete,
            note_toggle_star,
            note_move,
            reveal_in_finder,
            folder_rename,
            note_summarize_stream,
            note_edit_with_ai_stream,
            note_organize_drafts,
            test_ai_connection,
            workspace_get_setting,
            workspace_set_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

