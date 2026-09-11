import type { AiProvider } from "../../workspace/_lib/workspace-config";

export interface SettingsViewProps {
  onWorkspaceChanged: () => void;
}

export interface TextSizeOption {
  label: string;
  rem: number;
}

export interface AiModelOption {
  id: string;
  label: string;
  desc?: string;
}

export interface AiProviderOption {
  id: AiProvider;
  label: string;
  badge?: string;
  keyPlaceholder: string;
  defaultModel: string;
  models: AiModelOption[];
}
