"use client";

import { LocalFolderNode } from "../_types/folder.types";

export type AiProvider = "gemini" | "anthropic" | "openai" | "custom";
export type AiMode = "byok" | "system";

export interface SystemAiProfile {
  tier: "trial" | "pro" | "expired";
  quotaUsed: number;
  quotaLimit: number;
  resetDate?: string;
  serverToken?: string;
  customServerUrl?: string;
}

export interface WorkspaceConfig {
  rootPath: string;
  name: string;
  folders: LocalFolderNode[];
  autoSaveMs: number;
  setupDone: boolean;
  aiMode?: AiMode;
  systemAi?: SystemAiProfile;
  aiProvider?: AiProvider;
  aiApiKey?: string;
  aiModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

const STORAGE_KEY = "marki_workspace";

const DEFAULT_SYSTEM_AI: SystemAiProfile = {
  tier: "trial",
  quotaUsed: 0,
  quotaLimit: 25,
};

const DEFAULT_CONFIG: WorkspaceConfig = {
  rootPath: "",
  name: "My Workspace",
  folders: [],
  autoSaveMs: 1000,
  setupDone: false,
  aiMode: "byok",
  systemAi: DEFAULT_SYSTEM_AI,
  aiProvider: "gemini",
  aiApiKey: "",
  aiModel: "",
  geminiApiKey: "",
  geminiModel: "",
};

export const workspaceConfig = {
  get: (): WorkspaceConfig => {
    if (typeof window === "undefined") return DEFAULT_CONFIG;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load workspace config", e);
    }
    return DEFAULT_CONFIG;
  },

  set: (config: Partial<WorkspaceConfig>) => {
    if (typeof window === "undefined") return;
    try {
      const current = workspaceConfig.get();
      const next = { ...current, ...config };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save workspace config", e);
    }
  },

  clear: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },

  checkSystemAiQuota: (): { allowed: boolean; remaining: number; tier: string } => {
    const config = workspaceConfig.get();
    const system = config.systemAi || DEFAULT_SYSTEM_AI;
    if (system.tier === "pro") {
      return { allowed: true, remaining: 999999, tier: "pro" };
    }
    const remaining = Math.max(0, system.quotaLimit - system.quotaUsed);
    return {
      allowed: remaining > 0,
      remaining,
      tier: system.tier,
    };
  },

  consumeSystemAiQuota: (count = 1) => {
    const config = workspaceConfig.get();
    const system = config.systemAi || DEFAULT_SYSTEM_AI;
    if (system.tier === "pro") return;
    const newUsed = system.quotaUsed + count;
    workspaceConfig.set({
      systemAi: {
        ...system,
        quotaUsed: newUsed,
        tier: newUsed >= system.quotaLimit ? "expired" : system.tier,
      },
    });
  },
};
