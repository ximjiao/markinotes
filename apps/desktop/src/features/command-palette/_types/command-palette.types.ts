export interface CommandOption {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
}
