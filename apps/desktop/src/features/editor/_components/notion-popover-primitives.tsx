"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Search, ChevronRight } from "lucide-react";

export interface NotionMenuSectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function NotionMenuSectionHeader({ children, className }: NotionMenuSectionHeaderProps) {
  return (
    <div className={cn("px-2 py-1 text-[11px] font-semibold text-txt-muted", className)}>
      {children}
    </div>
  );
}

export interface NotionMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
  shortcut?: string;
  hasSubmenu?: boolean;
  destructive?: boolean;
  className?: string;
}

export function NotionMenuItem({
  icon,
  children,
  shortcut,
  hasSubmenu,
  destructive,
  className,
  ...props
}: NotionMenuItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer select-none",
        destructive
          ? "text-destructive hover:bg-destructive/15 focus:bg-destructive/15"
          : "text-txt-primary hover:bg-accent focus:bg-accent",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className={cn("shrink-0", destructive ? "text-destructive" : "text-txt-muted")}>{icon}</span>}
        <span className="truncate">{children}</span>
      </div>
      {shortcut && <span className={cn("text-[10px] shrink-0 ml-2", destructive ? "text-destructive/80" : "text-txt-muted")}>{shortcut}</span>}
      {hasSubmenu && <ChevronRight className="h-3 w-3 text-txt-muted shrink-0 ml-2" />}
    </button>
  );
}

export interface NotionMenuSwitchItemProps {
  icon?: React.ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function NotionMenuSwitchItem({
  icon,
  label,
  checked,
  onCheckedChange,
  className,
}: NotionMenuSwitchItemProps) {
  return (
    <div
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-txt-primary hover:bg-accent cursor-pointer select-none transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-txt-muted shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="scale-75 shrink-0"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export interface NotionMenuSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function NotionMenuSearchInput({
  value,
  onChange,
  placeholder = "Search actions...",
  className,
  autoFocus = true,
}: NotionMenuSearchInputProps) {
  return (
    <div className={cn("relative px-2 py-1.5", className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-txt-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-accent/40 text-txt-primary text-xs pl-7 pr-2 py-1.5 rounded-lg border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary/60 placeholder:text-txt-muted/70 transition-all"
        autoFocus={autoFocus}
      />
    </div>
  );
}

export interface NotionMenuFooterProps {
  wordCount?: number;
  charCount?: number;
  lastEditedText?: string;
  extra?: React.ReactNode;
  className?: string;
}

export function NotionMenuFooter({
  wordCount,
  charCount,
  lastEditedText = "Last edited Today",
  extra,
  className,
}: NotionMenuFooterProps) {
  return (
    <div className={cn("px-2.5 py-1.5 text-[10px] text-txt-muted select-none bg-accent/30 rounded-lg mt-1 space-y-0.5", className)}>
      {(wordCount !== undefined || charCount !== undefined) && (
        <div className="font-semibold text-txt-secondary">
          {wordCount ?? 0} words ({charCount ?? 0} characters)
        </div>
      )}
      <div className="flex items-center justify-between text-txt-muted">
        <span>{lastEditedText}</span>
        {extra}
      </div>
    </div>
  );
}
