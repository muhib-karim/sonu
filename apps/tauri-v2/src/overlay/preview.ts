export type PreviewText = { stable: string; partial: string };

/**
 * Parse a `preview-text` event payload. The Rust preview ticker emits
 * `{ stable, partial }` JSON (the word-boundary-confirmed prefix and the
 * volatile tail); fall back to treating a plain string as an all-volatile
 * tail so malformed or legacy payloads never crash the overlay.
 */
export function parsePreviewPayload(payload: unknown): PreviewText {
  if (
    payload &&
    typeof payload === "object" &&
    "stable" in payload &&
    "partial" in payload
  ) {
    const p = payload as { stable: unknown; partial: unknown };
    return {
      stable: typeof p.stable === "string" ? p.stable : "",
      partial: typeof p.partial === "string" ? p.partial : "",
    };
  }
  return {
    stable: "",
    partial: typeof payload === "string" ? payload : "",
  };
}
