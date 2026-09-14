import type { AiProviderOption, TextSizeOption } from "../_types/settings.types";

// Text size steps mapped to rem values
export const TEXT_SIZES: TextSizeOption[] = [
  { label: "XS", rem: 0.75 },
  { label: "S", rem: 0.8125 },
  { label: "M", rem: 0.875 },
  { label: "L", rem: 1 },
  { label: "XL", rem: 1.125 },
];

export const PROVIDER_OPTIONS: AiProviderOption[] = [
  {
    id: "gemini",
    label: "Google Gemini",
    badge: "Fast & High Context",
    keyPlaceholder: "AIzaSy...",
    defaultModel: "gemini-3.6-flash",
    models: [
      { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", desc: "Recommended · Latest & state-of-the-art" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "High efficiency & reasoning" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Fast multi-modal model" },
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", desc: "Complex reasoning & deep analysis" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    badge: "Smart & Natural",
    keyPlaceholder: "sk-ant-...",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: [
      { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", desc: "Recommended · State of the art" },
      { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", desc: "Lightweight & responsive" },
      { id: "claude-3-opus-20240229", label: "Claude 3 Opus", desc: "Deep analytical reasoning" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI ChatGPT",
    badge: "Industry Standard",
    keyPlaceholder: "sk-...",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Recommended · Fast & versatile" },
      { id: "gpt-4o", label: "GPT-4o", desc: "Flagship multi-modal model" },
      { id: "o3-mini", label: "o3-mini", desc: "High-level STEM & reasoning" },
    ],
  },
  {
    id: "custom",
    label: "Custom / Self-Hosted",
    badge: "Custom Endpoint",
    keyPlaceholder: "API key or token...",
    defaultModel: "custom-model",
    models: [
      { id: "custom-model", label: "Custom Model", desc: "Specify custom model identifier" },
    ],
  },
];
