/**
 * Shortcuts Help Component
 *
 * Displays a modal with all available keyboard shortcuts.
 * Triggered by pressing Ctrl+/ (Cmd+/ on macOS).
 *
 * @example
 * ```tsx
 * import { ShortcutsHelp, useShortcutsHelp } from '@/components/shortcuts-help';
 *
 * const { isOpen, open, close, toggle } = useShortcutsHelp();
 *
 * <ShortcutsHelp isOpen={isOpen} onClose={close} />
 * ```
 */

export { ShortcutsHelp, useShortcutsHelp } from "./ShortcutsHelp";
export type { ShortcutsHelpProps } from "./ShortcutsHelp";
