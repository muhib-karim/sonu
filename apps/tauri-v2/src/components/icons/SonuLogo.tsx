import React from "react";

interface SonuLogoProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  showText?: boolean;
}

const SonuLogo: React.FC<SonuLogoProps> = ({
  width = 120,
  height = 32,
  className = "",
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Logo Icon - Stylized microphone with sound waves */}
      <div className="relative">
        <div className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-center">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            className="text-zinc-300"
          >
            {/* Microphone */}
            <path
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M19 10v2a7 7 0 0 1-14 0v-2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M12 19v4M8 23h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Sound waves */}
            <path
              d="M22 8c1 1.5 1 4.5 0 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
            <path
              d="M2 8c-1 1.5-1 4.5 0 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
        </div>
      </div>

      {showText && (
        <span
          className="text-xl font-bold tracking-tight text-zinc-200"
          style={{ fontFamily: "'Geist Mono', ui-monospace, monospace" }}
        >
          SONU
        </span>
      )}
    </div>
  );
};

export default SonuLogo;

