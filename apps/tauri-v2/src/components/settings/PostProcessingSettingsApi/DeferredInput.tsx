import React, { useState } from "react";
import { Input } from "../../ui/Input";

interface DeferredInputProps {
  value: string;
  onBlur: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  className?: string;
  type?: string;
  disabledHint?: string;
}

// Text input that edits locally and commits on blur, so typing
// doesn't round-trip through settings on every keystroke.
export const DeferredInput: React.FC<DeferredInputProps> = React.memo(
  ({
    value,
    onBlur,
    disabled,
    placeholder,
    className = "",
    type = "text",
    disabledHint,
  }) => {
    const [localValue, setLocalValue] = useState(value);

    // Sync with prop changes
    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    return (
      <Input
        type={type}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        onBlur={() => onBlur(localValue)}
        placeholder={placeholder}
        variant="compact"
        disabled={disabled}
        className={`flex-1 ${className}`}
        title={disabled ? disabledHint : undefined}
      />
    );
  },
);

DeferredInput.displayName = "DeferredInput";
