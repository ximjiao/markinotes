use crate::db::{get_db_path, init_db};
use crate::models::NoteCardData;
use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
pub fn workspace_init(root_path: String) -> Result<(), String> {
    init_db(&root_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn note_list(workspace_path: String) -> Result<Vec<NoteCardData>, String> {
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, path, title, excerpt, group_name, updated_at, is_starred, tags FROM notes ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let note_iter = stmt
        .query_map([], |row| {
            let tags_str: Option<String> = row.get(7)?;
            let tags = tags_str.map(|s| s.split(',').map(|t| t.to_string()).collect());

            Ok(NoteCardData {
                id: row.get(0)?,
                path: row.get(1)?,
                title: row.get(2)?,
                excerpt: row.get(3)?,
                group_name: row.get(4)?,
                updated_at: row.get(5)?,
                is_starred: row.get::<_, i32>(6)? == 1,
                tags,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut notes = Vec::new();
    for note in note_iter {
        if let Ok(n) = note {
            notes.push(n);
        }
    }

    Ok(notes)
}

#[tauri::command]
pub fn note_create(workspace_path: String, folder_path: String, title: String) -> Result<NoteCardData, String> {
    // Ensure folder exists
    fs::create_dir_all(&folder_path).map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    // Sanitized filename
    let file_name = format!("{}.md", title.replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-', "_"));
    let mut path = PathBuf::from(&folder_path);
    path.push(&file_name);
    let path_str = path.to_string_lossy().to_string();

    let content = format!("# {}\n\n", title);
    fs::write(&path, &content).map_err(|e| e.to_string())?;

    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    // Group name is the last part of folder_path
    let group_name = PathBuf::from(&folder_path).file_name().unwrap_or_default().to_string_lossy().to_string();
    let updated_at = "Just now".to_string(); // In a real app, use chrono

    conn.execute(
        "INSERT INTO notes (id, path, title, excerpt, group_name, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, path_str, title, "", group_name, updated_at],
    ).map_err(|e| e.to_string())?;

    Ok(NoteCardData {
        id,
        path: path_str,
        title,
        excerpt: "".to_string(),
        group_name: Some(group_name),
        updated_at,
        is_starred: false,
        tags: None,
    })
}

#[tauri::command]
pub fn note_read(note_path: String) -> Result<String, String> {
    fs::read_to_string(&note_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn note_update(workspace_path: String, note_path: String, title: String, content: String, tags: Vec<String>) -> Result<(), String> {
    fs::write(&note_path, &content).map_err(|e| e.to_string())?;
    
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    let updated_at = "Just now".to_string();
    let tags_str = tags.join(",");
    let excerpt = content.chars().take(100).collect::<String>();
    
    conn.execute(
        "UPDATE notes SET title = ?1, excerpt = ?2, tags = ?3, updated_at = ?4 WHERE path = ?5",
        params![title, excerpt, tags_str, updated_at, note_path],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn note_delete(workspace_path: String, note_path: String) -> Result<(), String> {
    // Delete file if exists
    let _ = fs::remove_file(&note_path);
    
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "DELETE FROM notes WHERE path = ?1",
        params![note_path],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn note_toggle_star(workspace_path: String, note_path: String, starred: bool) -> Result<(), String> {
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    conn.execute(
        "UPDATE notes SET is_starred = ?1 WHERE path = ?2",
        params![if starred { 1 } else { 0 }, note_path],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
