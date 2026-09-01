import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-lg">
      <h3 className="text-base font-semibold text-txt-primary">{title}</h3>
      {description && <p className="text-xs text-txt-secondary mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
