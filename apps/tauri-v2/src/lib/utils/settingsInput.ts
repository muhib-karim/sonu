/**
 * Validation and formatting for settings inputs, kept out of the components
 * so the rules can be unit-tested and the add button and the add handler
 * cannot disagree about what is valid.
 */

/** Longer words are skipped by the Rust corrector anyway (`text.rs`). */
export const MAX_CUSTOM_WORD_LENGTH = 50;

/** Matches the `max` attribute of the history-limit number input. */
export const MAX_HISTORY_LIMIT = 1000;

/**
 * Normalises a word typed into the custom-words field. Returns the word to
 * store, or `null` if it must be rejected: empty after sanitising, more than
 * one word, too long, or already in the list.
 */
export const normalizeCustomWord = (
  input: string,
  existing: readonly string[],
): string | null => {
  const word = input.trim().replace(/[<>"'&]/g, "");
  if (
    !word ||
    /\s/.test(word) ||
    word.length > MAX_CUSTOM_WORD_LENGTH ||
    existing.includes(word)
  ) {
    return null;
  }
  return word;
};

/**
 * Parses the history-limit field. Returns `null` for anything that is not a
 * plain non-negative integer (including a cleared field, so the stored value
 * is kept while the user is typing) and caps the value at the input's max.
 */
export const parseHistoryLimit = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  return Math.min(Number(trimmed), MAX_HISTORY_LIMIT);
};

/** Formats a 0-1 volume as a whole percentage, clamped to 0-100%. */
export const formatVolume = (value: number): string =>
  `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`;
