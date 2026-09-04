use crate::db::{get_db_path, init_db};
use crate::models::NoteCardData;
use rusqlite::{params, Connection};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    std::process::Command::new("open")
        .arg("-R")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn folder_rename(workspace_path: String, old_path: String, new_path: String) -> Result<(), String> {
    std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;

    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Update the path of all notes in this folder or its subfolders
    conn.execute(
        "UPDATE notes SET path = ?1 || SUBSTR(path, LENGTH(?2) + 1) WHERE path LIKE ?3",
        params![new_path, old_path, format!("{}%", old_path)],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(serde::Deserialize)]
pub struct FolderInfo {
    path: String,
}

#[tauri::command]
pub fn workspace_init(root_path: String, folders: Vec<FolderInfo>) -> Result<(), String> {
    init_db(&root_path).map_err(|e| e.to_string())?;
    
    // Create default folders
    for folder in folders {
        let _ = fs::create_dir_all(&folder.path);
    }
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
            let path_str: String = row.get(1)?;
            let tags_str: Option<String> = row.get(7)?;
            let tags = tags_str.map(|s| s.split(',').map(|t| t.to_string()).collect());

            // Read live excerpt directly from file content to guarantee 600 chars length for all notes
            let excerpt = match fs::read_to_string(&path_str) {
                Ok(content) => content.chars().take(600).collect::<String>(),
                Err(_) => row.get::<_, String>(3).unwrap_or_default(),
            };

            Ok(NoteCardData {
                id: row.get(0)?,
                path: path_str,
                title: row.get(2)?,
                excerpt,
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
pub fn note_get_all_tags(workspace_path: String) -> Result<Vec<String>, String> {
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT tags FROM notes WHERE tags IS NOT NULL AND tags != ''")
        .map_err(|e| e.to_string())?;

    let tag_iter = stmt
        .query_map([], |row| {
            let tags_str: String = row.get(0)?;
            Ok(tags_str)
        })
        .map_err(|e| e.to_string())?;

    let mut all_tags = std::collections::HashSet::new();
    for tags_str in tag_iter {
        if let Ok(s) = tags_str {
            for tag in s.split(',') {
                let t = tag.trim();
                if !t.is_empty() {
                    all_tags.insert(t.to_string());
                }
            }
        }
    }

    let mut sorted_tags: Vec<String> = all_tags.into_iter().collect();
    sorted_tags.sort();

    Ok(sorted_tags)
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
    let updated_at = chrono::Utc::now().to_rfc3339();

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
    
    let updated_at = chrono::Utc::now().to_rfc3339();
    let tags_str = tags.join(",");
    let excerpt = content.chars().take(600).collect::<String>();
    
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

#[tauri::command]
pub fn note_move(workspace_path: String, note_path: String, new_folder_path: String) -> Result<String, String> {
    let file_name = PathBuf::from(&note_path).file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut new_path_buf = PathBuf::from(&new_folder_path);
    new_path_buf.push(&file_name);
    let new_path_str = new_path_buf.to_string_lossy().to_string();

    std::fs::rename(&note_path, &new_path_str).map_err(|e| e.to_string())?;

    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let group_name = PathBuf::from(&new_folder_path).file_name().unwrap_or_default().to_string_lossy().to_string();
    let updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE notes SET path = ?1, group_name = ?2, updated_at = ?3 WHERE path = ?4",
        params![new_path_str, group_name, updated_at, note_path],
    ).map_err(|e| e.to_string())?;

    Ok(new_path_str)
}

#[tauri::command]
pub async fn note_summarize_stream(
    workspace_path: String,
    note_id: String,
    model: Option<String>,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    // Ambil API key otomatis dari config UI atau .env
    let api_key = match custom_api_key.filter(|k| !k.is_empty()) {
        Some(k) => k,
        None => crate::ai::get_gemini_api_key(Some(&workspace_path))?
    };
    let resolved_model = custom_model.filter(|m| !m.is_empty()).or(model);

    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let (path, title): (String, String) = conn
        .query_row(
            "SELECT path, title FROM notes WHERE id = ?1",
            params![note_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Catatan dengan ID '{note_id}' tidak ditemukan: {e}"))?;

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Gagal membaca file catatan di '{path}': {e}"))?;

    // 1. Ekstrak kata terbanyak (descending) dengan stopwords filter
    let pointers = crate::ai::extract_top_word_pointers(&content, 15);

    // 2. Susun prompt dengan pointers frekuensi kata + konten asli catatan
    let prompt = crate::ai::build_summarize_prompt(&title, &content, &pointers);

    // 3. Streaming respons dari Gemini API via channel
    crate::ai::stream_gemini_summary(&api_key, resolved_model.as_deref(), &prompt, on_chunk).await
}

#[tauri::command]
pub async fn note_edit_with_ai_stream(
    workspace_path: String,
    selected_text: String,
    instruction: String,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let api_key = match custom_api_key.filter(|k| !k.is_empty()) {
        Some(k) => k,
        None => crate::ai::get_gemini_api_key(Some(&workspace_path))?
    };

    let prompt = format!(
        "Anda adalah asisten editor teks AI profesional.\n\
        Tugas Anda: Proses, poles, atau edit teks terpilih berikut sesuai dengan instruksi yang diberikan.\n\
        Output HANYA teks hasil edit/perbaikan tanpa basa-basi, salam pembuka/penutup, atau tanda kutip pembungkus ekstra.\n\n\
        [INSTRUKSI]:\n\
        {}\n\n\
        [TEKS TERPILIH]:\n\
        {}",
        instruction, selected_text
    );

    crate::ai::stream_gemini_summary(&api_key, custom_model.as_deref(), &prompt, on_chunk).await
}

#[tauri::command]
pub async fn note_organize_drafts(
    workspace_path: String,
    drafts_json: String,
    folders_json: String,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
) -> Result<String, String> {
    // Read API key
    let api_key = match custom_api_key.filter(|k| !k.is_empty()) {
        Some(k) => k,
        None => crate::ai::get_gemini_api_key(Some(&workspace_path))?
    };
    let env_model = custom_model.filter(|m| !m.is_empty()).or_else(|| std::env::var("GEMINI_MODEL").ok());
    
    // Call AI to get suggestions
    crate::ai::organize_drafts(&api_key, env_model.as_deref(), &drafts_json, &folders_json).await
}

#[tauri::command]
pub fn workspace_get_setting(workspace_path: String, key: String) -> Result<Option<String>, String> {
    crate::db::get_setting(&workspace_path, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workspace_set_setting(workspace_path: String, key: String, value: String) -> Result<(), String> {
    crate::db::set_setting(&workspace_path, &key, &value).map_err(|e| e.to_string())
}
