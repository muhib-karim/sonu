import React from "react";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-2">
      {title && (
        <div className="px-1">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-zinc-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="settings-group bg-surface border border-white/[0.06] rounded-xl overflow-visible">
        <div className="divide-y divide-white/[0.06]">{children}</div>
      </div>
    </div>
  );
};
