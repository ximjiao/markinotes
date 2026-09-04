use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn get_db_path(workspace_path: &str) -> PathBuf {
    let mut path = PathBuf::from(workspace_path);
    path.push(".markidown");
    path.push("db.sqlite");
    path
}

pub fn init_db(workspace_path: &str) -> Result<()> {
    let mut path = PathBuf::from(workspace_path);
    path.push(".markidown");
    
    if !path.exists() {
        std::fs::create_dir_all(&path).unwrap_or_default();
    }
    
    let db_path = get_db_path(workspace_path);
    let conn = Connection::open(&db_path)?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            excerpt TEXT,
            group_name TEXT,
            updated_at TEXT,
            is_starred INTEGER DEFAULT 0,
            tags TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;
    
    Ok(())
}

pub fn get_setting(workspace_path: &str, key: &str) -> Result<Option<String>> {
    let db_path = get_db_path(workspace_path);
    let conn = Connection::open(&db_path)?;
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query([key])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

pub fn set_setting(workspace_path: &str, key: &str, value: &str) -> Result<()> {
    let db_path = get_db_path(workspace_path);
    let conn = Connection::open(&db_path)?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [key, value],
    )?;
    Ok(())
}

