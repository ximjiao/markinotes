use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::time::Instant;

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
        "- (No dominant keywords found)".to_string()
    } else {
        pointers
            .iter()
            .map(|(word, count)| format!("- {word} ({count}x)"))
            .collect::<Vec<_>>()
            .join("\n")
    };

    format!(
        "You are an intelligent, clear, and structured note summarization assistant.\n\
        Your task is to create a comprehensive, concise, and well-structured summary of the user's note below.\n\n\
        [PRIMARY KEYWORD POINTERS (Sorted by frequency)]:\n\
        {pointer_str}\n\n\
        [ORIGINAL NOTE]:\n\
        Title: {title}\n\
        ---\n\
        {content}\n\
        ---\n\n\
        [SUMMARIZATION INSTRUCTIONS]:\n\
        1. Ensure all core points related to the primary keywords are well synthesized.\n\
        2. Present the summary in clean Markdown format using the same primary language as the note.\n\
        3. Start with a brief overview (TL;DR), followed by structured Key Takeaways and Action Items if applicable."
    )
}

// ==========================================
// Gemini Structs
// ==========================================
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

// ==========================================
// Anthropic Structs
// ==========================================
#[derive(Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    stream: bool,
    messages: Vec<AnthropicMessage>,
}

#[derive(Deserialize)]
struct AnthropicDelta {
    text: Option<String>,
}

#[derive(Deserialize)]
struct AnthropicStreamEvent {
    delta: Option<AnthropicDelta>,
    error: Option<AnthropicError>,
}

#[derive(Deserialize)]
struct AnthropicError {
    message: String,
}

#[derive(Deserialize)]
struct AnthropicResponseContent {
    text: Option<String>,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Option<Vec<AnthropicResponseContent>>,
    #[allow(dead_code)]
    error: Option<AnthropicError>,
}

// ==========================================
// OpenAI Structs
// ==========================================
#[derive(Serialize)]
struct OpenAiMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
struct OpenAiRequest {
    model: String,
    stream: bool,
    messages: Vec<OpenAiMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Deserialize)]
struct OpenAiDelta {
    content: Option<String>,
}

#[derive(Deserialize)]
struct OpenAiChoiceStream {
    delta: Option<OpenAiDelta>,
}

#[derive(Deserialize)]
struct OpenAiStreamChunk {
    choices: Option<Vec<OpenAiChoiceStream>>,
    error: Option<OpenAiError>,
}

#[derive(Deserialize)]
struct OpenAiChoice {
    message: Option<OpenAiMessageResponse>,
}

#[derive(Deserialize)]
struct OpenAiMessageResponse {
    content: Option<String>,
}

#[derive(Deserialize)]
struct OpenAiResponse {
    choices: Option<Vec<OpenAiChoice>>,
    #[allow(dead_code)]
    error: Option<OpenAiError>,
}

#[derive(Deserialize)]
struct OpenAiError {
    message: String,
}

// ==========================================
// Connection Test Response
// ==========================================
#[derive(Serialize)]
pub struct TestAiConnectionResult {
    pub success: bool,
    pub latency_ms: u64,
    pub message: String,
    pub model: String,
}

/// Resolve API Key from workspace .env, root .env, or env variable based on provider
pub fn resolve_api_key(
    provider: Option<&str>,
    workspace_path: Option<&str>,
    custom_api_key: Option<&str>,
) -> Result<String, String> {
    if let Some(key) = custom_api_key.filter(|k| !k.trim().is_empty()) {
        return Ok(key.trim().to_string());
    }

    if let Some(ws) = workspace_path {
        let ws_env = std::path::Path::new(ws).join(".env");
        if ws_env.exists() {
            let _ = dotenvy::from_path(&ws_env);
        }
    }
    let _ = dotenvy::dotenv();

    let prov = provider.unwrap_or("gemini").to_lowercase();
    match prov.as_str() {
        "anthropic" | "claude" => {
            std::env::var("ANTHROPIC_API_KEY").map_err(|_| {
                "Anthropic API key not found. Please add your API key in Settings or set ANTHROPIC_API_KEY in .env".to_string()
            })
        }
        "openai" | "chatgpt" => {
            std::env::var("OPENAI_API_KEY").map_err(|_| {
                "OpenAI API key not found. Please add your API key in Settings or set OPENAI_API_KEY in .env".to_string()
            })
        }
        _ => {
            // Default: Gemini
            std::env::var("GEMINI_API_KEY")
                .or_else(|_| std::env::var("ANTHROPIC_API_KEY"))
                .or_else(|_| std::env::var("OPENAI_API_KEY"))
                .map_err(|_| {
                    "API key not found. Please provide an API key in Settings or set GEMINI_API_KEY in .env".to_string()
                })
        }
    }
}

/// Fallback for backward compatibility
#[allow(dead_code)]
pub fn get_gemini_api_key(workspace_path: Option<&str>) -> Result<String, String> {
    resolve_api_key(Some("gemini"), workspace_path, None)
}

// ==========================================
// Streaming Implementation
// ==========================================

/// Stream AI completion based on selected provider
pub async fn stream_ai_completion(
    provider: Option<&str>,
    api_key: &str,
    model: Option<&str>,
    prompt: &str,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let prov = provider.unwrap_or("gemini").to_lowercase();
    match prov.as_str() {
        "anthropic" | "claude" => {
            stream_anthropic_summary(api_key, model, prompt, on_chunk).await
        }
        "openai" | "chatgpt" => {
            stream_openai_summary(api_key, model, prompt, on_chunk).await
        }
        _ => {
            stream_gemini_summary(api_key, model, prompt, on_chunk).await
        }
    }
}

/// Stream from Google Gemini API
pub async fn stream_gemini_summary(
    api_key: &str,
    model: Option<&str>,
    prompt: &str,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let env_model = std::env::var("GEMINI_MODEL").ok();
    let model_name = model
        .filter(|m| !m.is_empty())
        .or(env_model.as_deref().filter(|m| !m.is_empty()))
        .unwrap_or("gemini-1.5-flash");

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
        .map_err(|e| format!("Unable to connect to Gemini API. Please check your network connection: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        return Err(format!("Gemini API error (HTTP {status}): {error_body}"));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_res) = stream.next().await {
        let chunk_bytes = chunk_res.map_err(|e| format!("Error reading Gemini stream: {e}"))?;
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

/// Stream from Anthropic Claude API
pub async fn stream_anthropic_summary(
    api_key: &str,
    model: Option<&str>,
    prompt: &str,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let env_model = std::env::var("ANTHROPIC_MODEL").ok();
    let model_name = model
        .filter(|m| !m.is_empty())
        .or(env_model.as_deref().filter(|m| !m.is_empty()))
        .unwrap_or("claude-3-5-sonnet-20241022");

    let url = "https://api.anthropic.com/v1/messages";
    let client = reqwest::Client::new();
    let body = AnthropicRequest {
        model: model_name.to_string(),
        max_tokens: 4096,
        stream: true,
        messages: vec![AnthropicMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
    };

    let response = client
        .post(url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Unable to connect to Anthropic API. Please check your network connection: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic API error (HTTP {status}): {error_body}"));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_res) = stream.next().await {
        let chunk_bytes = chunk_res.map_err(|e| format!("Error reading Anthropic stream: {e}"))?;
        let text_chunk = String::from_utf8_lossy(&chunk_bytes);
        buffer.push_str(&text_chunk);

        while let Some(newline_idx) = buffer.find('\n') {
            let line = buffer[..newline_idx].trim().to_string();
            buffer.drain(..=newline_idx);

            if line.starts_with("data: ") {
                let json_str = &line["data: ".len()..];
                if let Ok(parsed) = serde_json::from_str::<AnthropicStreamEvent>(json_str) {
                    if let Some(err) = parsed.error {
                        return Err(format!("Anthropic API streaming error: {}", err.message));
                    }
                    if let Some(delta) = parsed.delta {
                        if let Some(text) = delta.text {
                            if !text.is_empty() {
                                let _ = on_chunk.send(text);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

/// Stream from OpenAI API
pub async fn stream_openai_summary(
    api_key: &str,
    model: Option<&str>,
    prompt: &str,
    on_chunk: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let env_model = std::env::var("OPENAI_MODEL").ok();
    let model_name = model
        .filter(|m| !m.is_empty())
        .or(env_model.as_deref().filter(|m| !m.is_empty()))
        .unwrap_or("gpt-4o-mini");

    let url = "https://api.openai.com/v1/chat/completions";
    let client = reqwest::Client::new();
    let body = OpenAiRequest {
        model: model_name.to_string(),
        stream: true,
        temperature: Some(0.3),
        messages: vec![OpenAiMessage {
            role: "user".to_string(),
            content: prompt.to_string(),
        }],
    };

    let response = client
        .post(url)
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Unable to connect to OpenAI API. Please check your network connection: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_body = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error (HTTP {status}): {error_body}"));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk_res) = stream.next().await {
        let chunk_bytes = chunk_res.map_err(|e| format!("Error reading OpenAI stream: {e}"))?;
        let text_chunk = String::from_utf8_lossy(&chunk_bytes);
        buffer.push_str(&text_chunk);

        while let Some(newline_idx) = buffer.find('\n') {
            let line = buffer[..newline_idx].trim().to_string();
            buffer.drain(..=newline_idx);

            if line.starts_with("data: ") {
                let json_str = &line["data: ".len()..];
                if json_str.trim() == "[DONE]" {
                    break;
                }
                if let Ok(parsed) = serde_json::from_str::<OpenAiStreamChunk>(json_str) {
                    if let Some(err) = parsed.error {
                        return Err(format!("OpenAI API streaming error: {}", err.message));
                    }
                    if let Some(choices) = parsed.choices {
                        for choice in choices {
                            if let Some(delta) = choice.delta {
                                if let Some(content) = delta.content {
                                    if !content.is_empty() {
                                        let _ = on_chunk.send(content);
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

// ==========================================
// Test AI Connection
// ==========================================

pub async fn test_ai_connection(
    provider: Option<&str>,
    api_key: &str,
    model: Option<&str>,
) -> Result<TestAiConnectionResult, String> {
    let prov = provider.unwrap_or("gemini").to_lowercase();
    let start = Instant::now();

    match prov.as_str() {
        "anthropic" | "claude" => {
            let model_name = model.filter(|m| !m.is_empty()).unwrap_or("claude-3-5-sonnet-20241022");
            let url = "https://api.anthropic.com/v1/messages";
            let client = reqwest::Client::new();
            let body = AnthropicRequest {
                model: model_name.to_string(),
                max_tokens: 16,
                stream: false,
                messages: vec![AnthropicMessage {
                    role: "user".to_string(),
                    content: "Reply with the single word 'Connected'.".to_string(),
                }],
            };

            let response = client
                .post(url)
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Anthropic connection error: {e}"))?;

            let latency = start.elapsed().as_millis() as u64;

            if !response.status().is_success() {
                let status = response.status();
                let err_text = response.text().await.unwrap_or_default();
                return Err(format!("Anthropic error (HTTP {status}): {err_text}"));
            }

            Ok(TestAiConnectionResult {
                success: true,
                latency_ms: latency,
                message: "Successfully connected to Anthropic Claude".to_string(),
                model: model_name.to_string(),
            })
        }
        "openai" | "chatgpt" => {
            let model_name = model.filter(|m| !m.is_empty()).unwrap_or("gpt-4o-mini");
            let url = "https://api.openai.com/v1/chat/completions";
            let client = reqwest::Client::new();
            let body = OpenAiRequest {
                model: model_name.to_string(),
                stream: false,
                temperature: Some(0.1),
                messages: vec![OpenAiMessage {
                    role: "user".to_string(),
                    content: "Reply with the single word 'Connected'.".to_string(),
                }],
            };

            let response = client
                .post(url)
                .header("Authorization", format!("Bearer {api_key}"))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("OpenAI connection error: {e}"))?;

            let latency = start.elapsed().as_millis() as u64;

            if !response.status().is_success() {
                let status = response.status();
                let err_text = response.text().await.unwrap_or_default();
                return Err(format!("OpenAI error (HTTP {status}): {err_text}"));
            }

            Ok(TestAiConnectionResult {
                success: true,
                latency_ms: latency,
                message: "Successfully connected to OpenAI".to_string(),
                model: model_name.to_string(),
            })
        }
        _ => {
            let model_name = model.filter(|m| !m.is_empty()).unwrap_or("gemini-1.5-flash");
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                model_name, api_key
            );

            let client = reqwest::Client::new();
            let body = GeminiRequest {
                contents: vec![GeminiContent {
                    parts: vec![GeminiPart {
                        text: "Reply with the single word 'Connected'.".to_string(),
                    }],
                }],
                generation_config: GeminiGenerationConfig { temperature: 0.1 },
            };

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Gemini connection error: {e}"))?;

            let latency = start.elapsed().as_millis() as u64;

            if !response.status().is_success() {
                let status = response.status();
                let err_text = response.text().await.unwrap_or_default();
                return Err(format!("Gemini error (HTTP {status}): {err_text}"));
            }

            Ok(TestAiConnectionResult {
                success: true,
                latency_ms: latency,
                message: "Successfully connected to Google Gemini".to_string(),
                model: model_name.to_string(),
            })
        }
    }
}

// ==========================================
// Organize Drafts Implementation
// ==========================================

/// Call AI API to organize drafts based on titles
pub async fn organize_drafts(
    provider: Option<&str>,
    api_key: &str,
    model: Option<&str>,
    drafts_json: &str,
    folders_json: &str,
) -> Result<String, String> {
    let prompt = format!(
        "You are an AI assistant that helps organize markdown notes.\n\
        I have a list of drafts (titles and IDs) and a list of available folders (names, IDs, and paths).\n\
        Your task is to assign each draft to the most appropriate folder based on its title.\n\
        If no available folder is appropriate, you must suggest a completely new folder name for it.\n\
        \n\
        Drafts:\n\
        {}\n\
        \n\
        Available Folders:\n\
        {}\n\
        \n\
        Return a raw JSON object (no markdown formatting, no backticks, just the JSON string) with two keys: `moves` and `creates`.\n\
        - `moves`: map the draft ID to the destination folder path (for existing folders).\n\
        - `creates`: map the draft ID to a new suggested folder name (for folders that do not exist yet).\n\
        For example:\n\
        {{\n\
          \"moves\": {{ \"draft-123\": \"/Users/name/Documents/Space/ProjectX\" }},\n\
          \"creates\": {{ \"draft-456\": \"Personal\" }}\n\
        }}",
        drafts_json, folders_json
    );

    let prov = provider.unwrap_or("gemini").to_lowercase();
    match prov.as_str() {
        "anthropic" | "claude" => {
            let model_name = model.filter(|m| !m.is_empty()).unwrap_or("claude-3-5-sonnet-20241022");
            let url = "https://api.anthropic.com/v1/messages";
            let client = reqwest::Client::new();
            let body = AnthropicRequest {
                model: model_name.to_string(),
                max_tokens: 2048,
                stream: false,
                messages: vec![AnthropicMessage {
                    role: "user".to_string(),
                    content: prompt,
                }],
            };

            let response = client
                .post(url)
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Anthropic connection error: {e}"))?;

            if !response.status().is_success() {
                let status = response.status();
                let error_body = response.text().await.unwrap_or_default();
                return Err(format!("Anthropic API error (HTTP {status}): {error_body}"));
            }

            let parsed_res: AnthropicResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse Anthropic response: {e}"))?;

            if let Some(content) = parsed_res.content {
                if let Some(first) = content.into_iter().next() {
                    if let Some(text) = first.text {
                        let clean_text = text.replace("```json", "").replace("```", "").trim().to_string();
                        return Ok(clean_text);
                    }
                }
            }

            Err("Anthropic did not return valid text content".to_string())
        }
        "openai" | "chatgpt" => {
            let model_name = model.filter(|m| !m.is_empty()).unwrap_or("gpt-4o-mini");
            let url = "https://api.openai.com/v1/chat/completions";
            let client = reqwest::Client::new();
            let body = OpenAiRequest {
                model: model_name.to_string(),
                stream: false,
                temperature: Some(0.1),
                messages: vec![OpenAiMessage {
                    role: "user".to_string(),
                    content: prompt,
                }],
            };

            let response = client
                .post(url)
                .header("Authorization", format!("Bearer {api_key}"))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("OpenAI connection error: {e}"))?;

            if !response.status().is_success() {
                let status = response.status();
                let error_body = response.text().await.unwrap_or_default();
                return Err(format!("OpenAI API error (HTTP {status}): {error_body}"));
            }

            let parsed_res: OpenAiResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse OpenAI response: {e}"))?;

            if let Some(choices) = parsed_res.choices {
                if let Some(first) = choices.into_iter().next() {
                    if let Some(msg) = first.message {
                        if let Some(text) = msg.content {
                            let clean_text = text.replace("```json", "").replace("```", "").trim().to_string();
                            return Ok(clean_text);
                        }
                    }
                }
            }

            Err("OpenAI did not return valid text content".to_string())
        }
        _ => {
            let env_model = std::env::var("GEMINI_MODEL").ok();
            let model_name = model
                .filter(|m| !m.is_empty())
                .or(env_model.as_deref().filter(|m| !m.is_empty()))
                .unwrap_or("gemini-1.5-flash");
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                model_name, api_key
            );

            let client = reqwest::Client::new();
            let body = GeminiRequest {
                contents: vec![GeminiContent {
                    parts: vec![GeminiPart {
                        text: prompt,
                    }],
                }],
                generation_config: GeminiGenerationConfig { temperature: 0.1 },
            };

            let response = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Unable to connect to Gemini API. Please check your network connection: {e}"))?;

            if !response.status().is_success() {
                let status = response.status();
                let error_body = response.text().await.unwrap_or_default();
                return Err(format!("Gemini API error (HTTP {status}): {error_body}"));
            }

            #[derive(Deserialize)]
            struct GeminiResponse {
                candidates: Option<Vec<GeminiCandidate>>,
            }

            let parsed_res: GeminiResponse = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse Gemini response: {e}"))?;

            if let Some(candidates) = parsed_res.candidates {
                if let Some(first) = candidates.into_iter().next() {
                    if let Some(content) = first.content {
                        if let Some(parts) = content.parts {
                            if let Some(first_part) = parts.into_iter().next() {
                                if let Some(text) = first_part.text {
                                    let clean_text = text.replace("```json", "").replace("```", "").trim().to_string();
                                    return Ok(clean_text);
                                }
                            }
                        }
                    }
                }
            }

            Err("Gemini did not return valid text content".to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_top_word_pointers_descending() {
        let sample = "Arsitektur tauri dan arsitektur rust. Tauri sangat cepat, tauri modern, rust andal.";
        let pointers = extract_top_word_pointers(sample, 5);

        assert_eq!(pointers[0].0, "tauri");
        assert_eq!(pointers[0].1, 3);
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
