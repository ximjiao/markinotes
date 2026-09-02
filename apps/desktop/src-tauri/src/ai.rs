use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Stopwords list for Indonesian and English to filter out noise in word counting
fn get_stopwords() -> HashSet<&'static str> {
    let mut set = HashSet::new();
    // Indonesian stopwords
    let id_stopwords = [
        "yang", "di", "dan", "dari", "ini", "itu", "untuk", "dengan", "pada", "ke",
        "adalah", "sebagai", "dalam", "bisa", "akan", "juga", "atau", "oleh", "karena",
        "ada", "sudah", "tidak", "saat", "lebih", "banyak", "kami", "kita", "mereka",
        "ia", "dia", "hal", "secara", "serta", "tersebut", "dapat", "hanya", "jika",
        "maka", "agar", "supaya", "lagi", "pun", "saya", "anda", "kamu", "tentang",
        "seperti", "bagi", "sampai", "antara", "setelah", "sebelum", "namun", "tetapi",
        "melalui", "terhadap", "suatu", "menjadi", "bukan", "hanya", "apakah", "bagaimana",
    ];
    for word in id_stopwords {
        set.insert(word);
    }

    // English stopwords
    let en_stopwords = [
        "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of", "with",
        "by", "from", "as", "is", "was", "are", "were", "it", "its", "this", "that",
        "these", "those", "be", "have", "has", "had", "do", "does", "did", "but",
        "not", "you", "we", "they", "he", "she", "can", "will", "if", "all", "so",
        "which", "what", "there", "their", "when", "where", "how", "who", "whom",
        "more", "some", "any", "no", "just", "about", "into", "than", "then", "up",
        "out", "other", "also",
    ];
    for word in en_stopwords {
        set.insert(word);
    }

    set
}

/// Extract top words ordered by count from highest to lowest (descending)
pub fn extract_top_word_pointers(content: &str, limit: usize) -> Vec<(String, usize)> {
    let stopwords = get_stopwords();
    let mut counts: HashMap<String, usize> = HashMap::new();

    for token in content.split_whitespace() {
        // Strip markdown punctuation, brackets, code blocks markers, etc.
        let cleaned: String = token
            .to_lowercase()
            .chars()
            .filter(|c| c.is_alphanumeric())
            .collect();

        // Must be non-empty, longer than 2 chars, not pure digits, and not a stopword
        if cleaned.len() > 2 
            && !cleaned.chars().all(|c| c.is_numeric()) 
            && !stopwords.contains(cleaned.as_str()) 
        {
            *counts.entry(cleaned).or_insert(0) += 1;
        }
    }

    let mut sorted: Vec<(String, usize)> = counts.into_iter().collect();
    // Sort descending by count (most frequent to least frequent)
    sorted.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    sorted.truncate(limit);
    sorted
}

/// Build the structured prompt combining top word pointers and the full original note
pub fn build_summarize_prompt(title: &str, content: &str, pointers: &[(String, usize)]) -> String {
    let pointer_str = if pointers.is_empty() {
        "- (Tidak ada kata kunci dominan)".to_string()
    } else {
        pointers
            .iter()
            .map(|(word, count)| format!("- {word} ({count}x)"))
            .collect::<Vec<_>>()
            .join("\n")
    };

    format!(
        "Anda adalah asisten perangkum catatan cerdas.\n\
        Tugas Anda adalah membuat ringkasan (summary) yang komprehensif, padat, dan terstruktur dari catatan pengguna di bawah ini.\n\n\
        [POINTER KATA KUNCI UTAMA (Diurutkan dari frekuensi terbanyak)]:\n\
        {pointer_str}\n\n\
        [CATATAN ASLI]:\n\
        Judul: {title}\n\
        ---\n\
        {content}\n\
        ---\n\n\
        [INSTRUKSI RINGKASAN]:\n\
        1. Pastikan seluruh poin utama yang berkaitan dengan daftar kata kunci di atas terangkum dengan baik.\n\
        2. Sajikan ringkasan dalam format Markdown dengan bahasa yang sama seperti bahasa utama catatan.\n\
        3. Mulai dengan ringkasan singkat (TL;DR), diikuti dengan poin-poin penting (Key Takeaways)."
    )
}

#[derive(Serialize)]
struct GeminiPart {
    text: String,
}

#[derive(Serialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Serialize)]
struct GeminiGenerationConfig {
    temperature: f32,
}

#[derive(Serialize)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
    #[serde(rename = "generationConfig")]
    generation_config: GeminiGenerationConfig,
}

#[derive(Deserialize)]
struct GeminiCandidatePart {
    text: Option<String>,
}

#[derive(Deserialize)]
struct GeminiCandidateContent {
    parts: Option<Vec<GeminiCandidatePart>>,
}

#[derive(Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiCandidateContent>,
}

#[derive(Deserialize)]
struct GeminiStreamChunk {
    candidates: Option<Vec<GeminiCandidate>>,
    error: Option<GeminiError>,
}

#[derive(Deserialize)]
struct GeminiError {
    message: String,
}

/// Load GEMINI_API_KEY from .env file or environment variables
pub fn get_gemini_api_key(workspace_path: Option<&str>) -> Result<String, String> {
    // 1. Check workspace folder .env if provided
    if let Some(ws) = workspace_path {
        let ws_env = std::path::Path::new(ws).join(".env");
        if ws_env.exists() {
            let _ = dotenvy::from_path(&ws_env);
        }
    }

    // 2. Search default .env (current directory & parent directories)
    let _ = dotenvy::dotenv();

    // 3. Read GEMINI_API_KEY from environment
    std::env::var("GEMINI_API_KEY").map_err(|_| {
        "GEMINI_API_KEY tidak ditemukan. Pastikan sudah mengatur GEMINI_API_KEY di file .env".to_string()
    })
}

/// Stream summarization from Gemini API to a Tauri IPC Channel
pub async fn stream_gemini_summary(
    api_key: &str,
    model: Option<&str>,
    prompt: &str,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let env_model = std::env::var("GEMINI_MODEL").ok();
    let model_name = model
        .or(env_model.as_deref())
        .unwrap_or("gemini-3.6-flash");
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
        model_name, api_key
    );

    let client = reqwest::Client::new();
    let body = GeminiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart {
                text: prompt.to_string(),
            }],
        }],
        generation_config: GeminiGenerationConfig { temperature: 0.3 },
    };

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gagal menghubungi Gemini API: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API error (HTTP {status}): {error_body}"));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_res) = stream.next().await {
        let chunk_bytes = chunk_res.map_err(|e| format!("Error membaca stream Gemini: {e}"))?;
        let text_chunk = String::from_utf8_lossy(&chunk_bytes);
        buffer.push_str(&text_chunk);

        // Process SSE lines
        while let Some(newline_idx) = buffer.find('\n') {
            let line = buffer[..newline_idx].trim().to_string();
            buffer.drain(..=newline_idx);

            if line.starts_with("data: ") {
                let json_str = &line["data: ".len()..];
                if let Ok(parsed) = serde_json::from_str::<GeminiStreamChunk>(json_str) {
                    if let Some(err) = parsed.error {
                        return Err(format!("Gemini API streaming error: {}", err.message));
                    }

                    if let Some(candidates) = parsed.candidates {
                        for candidate in candidates {
                            if let Some(content) = candidate.content {
                                if let Some(parts) = content.parts {
                                    for part in parts {
                                        if let Some(text) = part.text {
                                            if !text.is_empty() {
                                                let _ = on_chunk.send(text);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_top_word_pointers_descending() {
        let sample = "Arsitektur tauri dan arsitektur rust. Tauri sangat cepat, tauri modern, rust andal.";
        let pointers = extract_top_word_pointers(sample, 5);

        // "tauri" appears 3 times, "arsitektur" 2 times, "rust" 2 times
        assert_eq!(pointers[0].0, "tauri");
        assert_eq!(pointers[0].1, 3);
        // Next words should have frequency <= previous
        assert!(pointers[1].1 <= pointers[0].1);
        assert_eq!(pointers[1].1, 2);
        assert_eq!(pointers[2].1, 2);
    }

    #[test]
    fn test_stopwords_filtered() {
        let sample = "yang di dan untuk dengan pada sebuah catatan penting tentang database";
        let pointers = extract_top_word_pointers(sample, 10);

        let words: Vec<&str> = pointers.iter().map(|(w, _)| w.as_str()).collect();
        assert!(!words.contains(&"yang"));
        assert!(!words.contains(&"dan"));
        assert!(!words.contains(&"untuk"));
        assert!(words.contains(&"catatan"));
        assert!(words.contains(&"penting"));
        assert!(words.contains(&"database"));
    }
}
