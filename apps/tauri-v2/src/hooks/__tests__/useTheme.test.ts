import { describe, it, expect } from "vitest";
import { resolvedTheme, ACCENT_COLORS } from "../useTheme";

describe("resolvedTheme", () => {
  it("resolves explicit light mode", () => {
    expect(resolvedTheme("light")).toBe("light");
  });

  it("resolves explicit dark mode", () => {
    expect(resolvedTheme("dark")).toBe("dark");
  });

  it("falls back to dark when mode is undefined (matches previous app behavior)", () => {
    // matchMedia mock in test setup reports matches: false (light), but an
    // undefined setting must keep the historical default: dark.
    expect(resolvedTheme(undefined)).toBe("dark");
  });
});

describe("ACCENT_COLORS", () => {
  it("contains unique ids with hex colors", () => {
    const ids = ACCENT_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of ACCENT_COLORS) {
      expect(c.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("includes the default zinc accent", () => {
    expect(ACCENT_COLORS.some((c) => c.id === "zinc")).toBe(true);
  });
});
