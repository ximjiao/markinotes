"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export interface SegmentedTabOption<T extends string = string> {
  value: T;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedTabsProps<T extends string = string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedTabOption<T>[];
  size?: "xs" | "sm" | "md";
  className?: string;
  listClassName?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

const SIZE_VARIANTS = {
  xs: {
    list: "h-6 p-0.5 rounded-md gap-0.5 bg-secondary/80 border border-border/50",
    trigger: "h-5 px-1.5 text-[10px] rounded-[4px] gap-1 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-2xs font-medium",
  },
  sm: {
    list: "h-7 p-0.5 rounded-lg gap-0.5 bg-muted/60 border border-border/60",
    trigger: "h-6 px-2 text-xs rounded-md gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs font-medium",
  },
  md: {
    list: "h-9 p-1 rounded-lg gap-1 bg-muted/70 border border-border/60",
    trigger: "h-7 px-3 text-sm rounded-md gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-medium",
  },
};

export function SegmentedTabs<T extends string = string>({
  value,
  onValueChange,
  options,
  size = "sm",
  className,
  listClassName,
  triggerClassName,
  disabled = false,
}: SegmentedTabsProps<T>) {
  const variant = SIZE_VARIANTS[size];

  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(val) => onValueChange(val as T)}
      className={cn("inline-flex select-none", className)}
    >
      <TabsPrimitive.List
        className={cn(
          "inline-flex items-center justify-center",
          variant.list,
          listClassName
        )}
      >
        {options.map((option) => (
          <TabsPrimitive.Trigger
            key={option.value}
            value={option.value}
            disabled={disabled || option.disabled}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 text-txt-muted hover:text-txt-primary cursor-pointer",
              variant.trigger,
              triggerClassName
            )}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            {option.label && <span>{option.label}</span>}
            {option.badge && <span className="shrink-0">{option.badge}</span>}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
