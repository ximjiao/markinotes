use crate::db::{get_db_path, init_db};
use crate::models::NoteCardData;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
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
pub fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
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

fn sync_workspace_files(workspace_path: &str, conn: &Connection) {
    let root = PathBuf::from(workspace_path);
    if !root.exists() || !root.is_dir() {
        return;
    }

    fn scan_dir(dir: &std::path::Path, conn: &Connection) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = entry.file_name().to_string_lossy().to_string();

                if file_name.starts_with('.') || file_name == "node_modules" {
                    continue;
                }

                if path.is_dir() {
                    scan_dir(&path, conn);
                } else if path.is_file() {
                    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
                    if ext == "md" || ext == "markdown" {
                        let path_str = path.to_string_lossy().to_string();

                        let exists: bool = conn
                            .query_row(
                                "SELECT 1 FROM notes WHERE path = ?1",
                                params![path_str],
                                |_| Ok(true),
                            )
                            .unwrap_or(false);

                        if !exists {
                            let content = fs::read_to_string(&path).unwrap_or_default();
                            let title = content
                                .lines()
                                .find(|line| !line.trim().is_empty())
                                .map(|line| {
                                    let mut s = line.trim().trim_start_matches('#').trim();
                                    if s.starts_with('[') && s.contains(']') {
                                        if let Some(end_bracket) = s.find(']') {
                                            s = &s[1..end_bracket];
                                        }
                                    }
                                    s.replace(['*', '_', '`', '~'], "").trim().to_string()
                                })
                                .filter(|s| !s.is_empty())
                                .unwrap_or_else(|| {
                                    path.file_stem()
                                        .map(|s| s.to_string_lossy().to_string())
                                        .unwrap_or_else(|| "Untitled Note".to_string())
                                });

                            let excerpt = content.chars().take(600).collect::<String>();
                            let group_name = path
                                .parent()
                                .and_then(|p| p.file_name())
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_default();

                            let updated_at = entry
                                .metadata()
                                .ok()
                                .and_then(|m| m.modified().ok())
                                .map(|time| {
                                    let dt: chrono::DateTime<chrono::Utc> = time.into();
                                    dt.to_rfc3339()
                                })
                                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

                            let id = Uuid::new_v4().to_string();
                            let initial_context = format!("Title: {title}");

                            let _ = conn.execute(
                                "INSERT INTO notes (id, path, title, excerpt, group_name, updated_at, ai_context) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                                params![id, path_str, title, excerpt, group_name, updated_at, initial_context],
                            );
                        }
                    }
                }
            }
        }
    }

    scan_dir(&root, conn);

    // Clean up notes whose files no longer exist on disk
    if let Ok(mut stmt) = conn.prepare("SELECT path FROM notes") {
        if let Ok(rows) = stmt.query_map([], |row| row.get::<_, String>(0)) {
            let mut paths_to_delete = Vec::new();
            for path_res in rows.flatten() {
                if !std::path::Path::new(&path_res).exists() {
                    paths_to_delete.push(path_res);
                }
            }
            for p in paths_to_delete {
                let _ = conn.execute("DELETE FROM notes WHERE path = ?1", params![p]);
            }
        }
    }
}

#[tauri::command]
pub fn note_list(workspace_path: String) -> Result<Vec<NoteCardData>, String> {
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    // Auto-discover and sync any files created directly in folder
    sync_workspace_files(&workspace_path, &conn);

    let mut stmt = conn
        .prepare("SELECT id, path, title, excerpt, group_name, updated_at, is_starred, tags FROM notes ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let note_iter = stmt
        .query_map([], |row| {
            let path_str: String = row.get(1)?;
            let tags_str: Option<String> = row.get(7)?;
            let tags = tags_str.map(|s| s.split(',').map(|t| t.to_string()).collect());

            // Read live excerpt directly from file content to guarantee 3000 chars length for all notes (rich previews)
            let excerpt = match fs::read_to_string(&path_str) {
                Ok(content) => content.chars().take(3000).collect::<String>(),
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
    let sanitized = title.replace(|c: char| !c.is_alphanumeric() && c != ' ' && c != '-', "_");
    let mut counter = 0;
    let mut file_name = format!("{sanitized}.md");
    let mut path = PathBuf::from(&folder_path);
    path.push(&file_name);

    while path.exists() {
        counter += 1;
        file_name = format!("{sanitized}_{counter}.md");
        path = PathBuf::from(&folder_path);
        path.push(&file_name);
    }
    let path_str = path.to_string_lossy().to_string();

    let content = format!("# {}\n\n", title);
    fs::write(&path, &content).map_err(|e| e.to_string())?;

    init_db(&workspace_path).map_err(|e| e.to_string())?;
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    
    // Group name is the last part of folder_path
    let group_name = PathBuf::from(&folder_path).file_name().unwrap_or_default().to_string_lossy().to_string();
    let updated_at = chrono::Utc::now().to_rfc3339();

    let initial_context = format!("Title: {title}");
    conn.execute(
        "INSERT INTO notes (id, path, title, excerpt, group_name, updated_at, ai_context) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, path_str, title, "", group_name, updated_at, initial_context],
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

#[derive(Serialize, Deserialize)]
pub struct BufferedNoteReadResult {
    pub content: String,
    pub size_bytes: usize,
    pub line_count: usize,
}

#[tauri::command]
pub fn note_read(note_path: String) -> Result<String, String> {
    fs::read_to_string(&note_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn note_read_buffered(note_path: String) -> Result<BufferedNoteReadResult, String> {
    use std::io::Read;
    let file = std::fs::File::open(&note_path).map_err(|e| format!("Gagal membuka file: {e}"))?;
    let mut reader = std::io::BufReader::with_capacity(64 * 1024, file);
    let mut content = String::new();
    reader.read_to_string(&mut content).map_err(|e| format!("Gagal membaca buffer file: {e}"))?;
    let size_bytes = content.len();
    let line_count = content.lines().count();

    Ok(BufferedNoteReadResult {
        content,
        size_bytes,
        line_count,
    })
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
pub async fn note_save_stream(
    workspace_path: String,
    note_path: String,
    title: String,
    content: String,
    tags: Vec<String>,
) -> Result<usize, String> {
    use std::io::Write;
    let path = std::path::Path::new(&note_path);
    let parent = path.parent().unwrap_or_else(|| std::path::Path::new(""));
    let temp_path = parent.join(format!(".tmp_stream_{}.marki", Uuid::new_v4()));

    // Stream write through buffer chunks
    {
        let file = std::fs::File::create(&temp_path)
            .map_err(|e| format!("Gagal inisialisasi temp file untuk stream write: {e}"))?;
        let mut writer = std::io::BufWriter::with_capacity(64 * 1024, file);

        let bytes = content.as_bytes();
        let chunk_size = 16 * 1024; // 16KB stream chunk
        for chunk in bytes.chunks(chunk_size) {
            writer.write_all(chunk).map_err(|e| format!("Gagal menulis stream chunk: {e}"))?;
        }
        writer.flush().map_err(|e| format!("Gagal flush stream buffer: {e}"))?;
    }

    // Atomic rename to target file path
    std::fs::rename(&temp_path, &note_path).map_err(|e| {
        let _ = std::fs::remove_file(&temp_path);
        format!("Gagal swap atomic file stream: {e}")
    })?;

    // SQLite update
    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let updated_at = chrono::Utc::now().to_rfc3339();
    let tags_str = tags.join(",");
    let excerpt = content.chars().take(100).collect::<String>();

    let pointers = crate::ai::extract_top_word_pointers(&content, 10);
    let ai_context = if pointers.is_empty() {
        format!("Title: {title}")
    } else {
        format!(
            "Title: {title}. Key topics: {}",
            pointers.iter().map(|(w, _)| w.as_str()).collect::<Vec<_>>().join(", ")
        )
    };

    conn.execute(
        "UPDATE notes SET title = ?1, excerpt = ?2, tags = ?3, updated_at = ?4, ai_context = ?5 WHERE path = ?6",
        params![title, excerpt, tags_str, updated_at, ai_context, note_path],
    ).map_err(|e| e.to_string())?;

    Ok(content.len())
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
    fs::create_dir_all(&new_folder_path).map_err(|e| e.to_string())?;

    let file_name = PathBuf::from(&note_path).file_name().unwrap_or_default().to_string_lossy().to_string();
    let mut new_path_buf = PathBuf::from(&new_folder_path);
    new_path_buf.push(&file_name);

    if new_path_buf.exists() && new_path_buf != PathBuf::from(&note_path) {
        let stem = PathBuf::from(&note_path).file_stem().unwrap_or_default().to_string_lossy().to_string();
        let mut counter = 1;
        while new_path_buf.exists() {
            new_path_buf = PathBuf::from(&new_folder_path);
            new_path_buf.push(format!("{stem}_{counter}.md"));
            counter += 1;
        }
    }

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
    provider: Option<String>,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let api_key = crate::ai::resolve_api_key(
        provider.as_deref(),
        Some(&workspace_path),
        custom_api_key.as_deref(),
    )?;

    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let (path, title): (String, String) = conn
        .query_row(
            "SELECT path, title FROM notes WHERE id = ?1",
            params![note_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Note with ID '{note_id}' was not found: {e}"))?;

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Unable to read note file at '{path}': {e}"))?;

    // 1. Extract top word pointers with stopwords filter
    let pointers = crate::ai::extract_top_word_pointers(&content, 15);

    // 2. Build summarize prompt with frequency pointers + original content
    let prompt = crate::ai::build_summarize_prompt(&title, &content, &pointers);

    // 3. Stream response via channel based on provider
    crate::ai::stream_ai_completion(
        provider.as_deref(),
        &api_key,
        custom_model.as_deref(),
        &prompt,
        on_chunk,
    ).await
}

#[tauri::command]
pub async fn note_edit_with_ai_stream(
    workspace_path: String,
    selected_text: String,
    instruction: String,
    provider: Option<String>,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let api_key = crate::ai::resolve_api_key(
        provider.as_deref(),
        Some(&workspace_path),
        custom_api_key.as_deref(),
    )?;

    let prompt = format!(
        "You are a professional AI text editor.\n\
        Your task: Polish, edit, or transform the selected text below according to the provided instructions.\n\
        Output ONLY the edited/improved text with no conversational filler, pleasantries, or surrounding quotes.\n\n\
        [INSTRUCTIONS]:\n\
        {}\n\n\
        [SELECTED TEXT]:\n\
        {}",
        instruction, selected_text
    );

    crate::ai::stream_ai_completion(
        provider.as_deref(),
        &api_key,
        custom_model.as_deref(),
        &prompt,
        on_chunk,
    ).await
}

#[tauri::command]
pub async fn note_chat_stream(
    workspace_path: String,
    note_id: String,
    messages_json: String,
    provider: Option<String>,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
    mode: Option<String>,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let api_key = crate::ai::resolve_api_key(
        provider.as_deref(),
        Some(&workspace_path),
        custom_api_key.as_deref(),
    )?;

    let db_path = get_db_path(&workspace_path);
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let (path, title, ai_context): (String, String, Option<String>) = conn
        .query_row(
            "SELECT path, title, ai_context FROM notes WHERE id = ?1",
            params![note_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2).ok())),
        )
        .map_err(|e| format!("Note with ID '{note_id}' was not found: {e}"))?;

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Unable to read note file at '{path}': {e}"))?;

    // If ai_context was not yet stored or empty, compute and cache it in the database
    let note_context_summary = match ai_context.filter(|c| !c.trim().is_empty()) {
        Some(c) => c,
        None => {
            let pointers = crate::ai::extract_top_word_pointers(&content, 10);
            let computed = if pointers.is_empty() {
                format!("Title: {title}")
            } else {
                format!(
                    "Title: {title}. Key topics: {}",
                    pointers.iter().map(|(w, _)| w.as_str()).collect::<Vec<_>>().join(", ")
                )
            };
            let _ = conn.execute(
                "UPDATE notes SET ai_context = ?1 WHERE id = ?2",
                params![&computed, &note_id],
            );
            computed
        }
    };

    #[derive(serde::Deserialize)]
    struct ChatMessage {
        role: String,
        content: String,
    }

    let history: Vec<ChatMessage> = serde_json::from_str(&messages_json).unwrap_or_default();
    let mut history_str = String::new();
    for msg in &history {
        let label = if msg.role == "user" { "User" } else { "Assistant" };
        history_str.push_str(&format!("{label}: {}\n\n", msg.content));
    }

    let chat_mode = mode.as_deref().unwrap_or("strict").to_lowercase();
    let is_strict = chat_mode != "explore";

    let mode_instructions = if is_strict {
        format!(
            "[MODE: STRICT NOTE CONTEXT (Prompt-Enforced Refusal)]\n\
            1. STRICT CONTEXT GROUNDING:\n\
               Answer ONLY based on the facts, concepts, and information directly provided in [NOTE CONTEXT] and [NOTE CONTEXT SUMMARY].\n\
            2. OUT OF CONTEXT VALIDATION & REFUSAL:\n\
               If the user asks questions that are OUT OF CONTEXT or UNRELATED to this note (for example: general knowledge, cooking recipes, random programming problems, unrelated facts, or topics not covered in this note):\n\
               - You MUST REFUSE to answer the off-topic question.\n\
               - Politely inform the user that their query is outside the scope of this note ('{title}').\n\
               - State clearly (in the user's language):\n\
                 * In English: 'This question is outside the context of the note \"{title}\". In Strict Mode, I can only answer questions directly relevant to this note. Relevant topics include: {note_context_summary}.'\n\
                 * In Indonesian: 'Pertanyaan ini berada di luar konteks catatan \"{title}\". Dalam Mode Ketat (Strict Mode), saya hanya menjawab pertanyaan yang terkait langsung dengan catatan ini. Topik relevan meliputi: {note_context_summary}.'\n\
               - Briefly mention what topics are relevant to this note and suggest questions the user can ask.\n\
               - DO NOT provide the answer to the off-topic query.\n\
            3. IN-CONTEXT RESPONSES:\n\
               For relevant questions, provide clear, concise, well-structured answers using clean Markdown (with bullet points, bold keywords, headers, or code blocks where appropriate).\n\
            4. Match the language used by the user (English or Indonesian)."
        )
    } else {
        format!(
            "[MODE: EXPLORE & BRAINSTORM (Note Anchor with Context Verification)]\n\
            1. NOTE AS BASE ANCHOR:\n\
               Use [NOTE CONTEXT] and [NOTE CONTEXT SUMMARY] as your primary base and anchor. You are encouraged to help the user brainstorm, expand on concepts, provide creative examples, counter-arguments, or related external knowledge that bridges back to the note's subject.\n\
            2. MANDATORY CHECK-IN (RELATION TO NOTE):\n\
               Every time you answer, you MUST actively link your thoughts back to the note. At the end of your response, ALWAYS ask the user how this relates to their note and whether they want to integrate it into their note.\n\
               For example, conclude with a friendly check-in question:\n\
               * In English: 'Does this align with what you are exploring for \"{title}\"? Would you like me to help draft or incorporate these points into your note?'\n\
               * In Indonesian: 'Apakah ini berkaitan dengan rencana catatan \"{title}\"? Apakah Anda ingin saya bantu menyusun poin-poin ini ke dalam catatan Anda?'\n\
            3. Format responses using clean, structured Markdown.\n\
            4. Match the language used by the user (English or Indonesian)."
        )
    };

    let prompt = format!(
        "You are an intelligent, helpful AI assistant built directly into Markinotes (a modern markdown editor).\n\
        The user is reviewing or chatting about the following note.\n\n\
        [NOTE CONTEXT]:\n\
        Title: {title}\n\
        Context Summary: {note_context_summary}\n\
        Content:\n\
        ---\n\
        {content}\n\
        ---\n\n\
        [CONVERSATION HISTORY]:\n\
        {history_str}\n\
        [INSTRUCTIONS]:\n\
        {mode_instructions}\n\
        Assistant:"
    );

    crate::ai::stream_ai_completion(
        provider.as_deref(),
        &api_key,
        custom_model.as_deref(),
        &prompt,
        on_chunk,
    ).await
}

#[tauri::command]
pub async fn note_organize_drafts(
    workspace_path: String,
    drafts_json: String,
    folders_json: String,
    provider: Option<String>,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
) -> Result<String, String> {
    let api_key = crate::ai::resolve_api_key(
        provider.as_deref(),
        Some(&workspace_path),
        custom_api_key.as_deref(),
    )?;
    
    // Call AI to get suggestions
    crate::ai::organize_drafts(
        provider.as_deref(),
        &api_key,
        custom_model.as_deref(),
        &drafts_json,
        &folders_json,
    ).await
}

#[tauri::command]
pub async fn test_ai_connection(
    workspace_path: Option<String>,
    provider: Option<String>,
    custom_api_key: Option<String>,
    custom_model: Option<String>,
) -> Result<crate::ai::TestAiConnectionResult, String> {
    let api_key = crate::ai::resolve_api_key(
        provider.as_deref(),
        workspace_path.as_deref(),
        custom_api_key.as_deref(),
    )?;

    crate::ai::test_ai_connection(
        provider.as_deref(),
        &api_key,
        custom_model.as_deref(),
    ).await
}

#[tauri::command]
pub fn workspace_get_setting(workspace_path: String, key: String) -> Result<Option<String>, String> {
    crate::db::get_setting(&workspace_path, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workspace_set_setting(workspace_path: String, key: String, value: String) -> Result<(), String> {
    crate::db::set_setting(&workspace_path, &key, &value).map_err(|e| e.to_string())
}

