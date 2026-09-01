use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteCardData {
    pub id: String,
    pub path: String,
    pub title: String,
    pub excerpt: String,
    pub group_name: Option<String>,
    pub updated_at: String,
    pub is_starred: bool,
    pub tags: Option<Vec<String>>,
}
