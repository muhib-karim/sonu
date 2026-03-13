/**
 * SONU Logo Component
 * Consistent branding using shadCN design system
 */

import React from "react";

interface SonuLogoProps {
  /** Logo size variant */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show text alongside icon */
  showText?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeMap = {
  sm: { container: 24, icon: 14, text: "text-sm" },
  md: { container: 32, icon: 18, text: "text-base" },
  lg: { container: 48, icon: 28, text: "text-lg" },
  xl: { container: 64, icon: 38, text: "text-xl" },
};

export const SonuLogo: React.FC<SonuLogoProps> = ({
  size = "md",
  showText = true,
  className = "",
}) => {
  const { container, icon, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon Container */}
      <div
        className="flex items-center justify-center rounded-md bg-brand-800 border border-brand-700"
        style={{ width: container, height: container }}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-brand-400"
        >
          {/* Microphone Body */}
          <rect x="8" y="4" width="8" height="12" rx="4" fill="currentColor" />
          {/* Microphone Stand */}
          <path
            d="M6 12C6 15.3137 8.68629 18 12 18C15.3137 18 18 15.3137 18 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Stand Base */}
          <path
            d="M12 18V21M9 21H15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Sound Waves */}
          <path
            d="M4 10C4 10 3 12 4 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-brand-500"
          />
          <path
            d="M20 10C20 10 21 12 20 14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-brand-500"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <span
          className={`font-mono font-semibold tracking-wider text-brand-50 ${text}`}
        >
          SONU
        </span>
      )}
    </div>
  );
};

export default SonuLogo;
