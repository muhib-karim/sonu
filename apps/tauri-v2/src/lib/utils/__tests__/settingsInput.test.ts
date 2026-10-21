import { describe, it, expect } from "vitest";
import {
  MAX_CUSTOM_WORD_LENGTH,
  MAX_HISTORY_LIMIT,
  formatVolume,
  normalizeCustomWord,
  parseHistoryLimit,
} from "../settingsInput";

describe("normalizeCustomWord", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeCustomWord("  Kubernetes  ", [])).toBe("Kubernetes");
  });

  it("strips characters that could break markup", () => {
    expect(normalizeCustomWord(`<b>"Tauri"&'`, [])).toBe("bTauri");
  });

  it("rejects empty and whitespace-only input", () => {
    expect(normalizeCustomWord("", [])).toBeNull();
    expect(normalizeCustomWord("   ", [])).toBeNull();
  });

  it("rejects input that is empty once sanitised", () => {
    expect(normalizeCustomWord("<>&", [])).toBeNull();
  });

  it("rejects multi-word input, including tabs", () => {
    expect(normalizeCustomWord("two words", [])).toBeNull();
    expect(normalizeCustomWord("tab\tseparated", [])).toBeNull();
  });

  it("accepts a word at the length limit and rejects one past it", () => {
    const atLimit = "a".repeat(MAX_CUSTOM_WORD_LENGTH);
    expect(normalizeCustomWord(atLimit, [])).toBe(atLimit);
    expect(normalizeCustomWord(`${atLimit}a`, [])).toBeNull();
  });

  it("rejects a word already in the list", () => {
    expect(normalizeCustomWord(" Sonu ", ["Sonu"])).toBeNull();
  });

  it("treats different casing as a different word", () => {
    expect(normalizeCustomWord("sonu", ["Sonu"])).toBe("sonu");
  });
});

describe("parseHistoryLimit", () => {
  it("parses a non-negative integer", () => {
    expect(parseHistoryLimit("25")).toBe(25);
    expect(parseHistoryLimit("0")).toBe(0);
  });

  it("ignores surrounding whitespace", () => {
    expect(parseHistoryLimit(" 7 ")).toBe(7);
  });

  it("caps the value at the input's maximum", () => {
    expect(parseHistoryLimit("5000")).toBe(MAX_HISTORY_LIMIT);
  });

  it("rejects a cleared field so the stored value is kept", () => {
    expect(parseHistoryLimit("")).toBeNull();
  });

  it("rejects negative, fractional and non-numeric input", () => {
    expect(parseHistoryLimit("-1")).toBeNull();
    expect(parseHistoryLimit("1.5")).toBeNull();
    expect(parseHistoryLimit("12abc")).toBeNull();
    expect(parseHistoryLimit("1e3")).toBeNull();
  });
});

describe("formatVolume", () => {
  it("formats a 0-1 volume as a whole percentage", () => {
    expect(formatVolume(0)).toBe("0%");
    expect(formatVolume(0.5)).toBe("50%");
    expect(formatVolume(1)).toBe("100%");
  });

  it("rounds floating-point slider steps", () => {
    expect(formatVolume(0.1 + 0.2)).toBe("30%");
  });

  it("clamps out-of-range values", () => {
    expect(formatVolume(-0.2)).toBe("0%");
    expect(formatVolume(1.4)).toBe("100%");
  });
});
