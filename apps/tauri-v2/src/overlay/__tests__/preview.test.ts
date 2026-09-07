import { describe, expect, it } from "vitest";
import { parsePreviewPayload } from "../preview";

describe("parsePreviewPayload", () => {
  it("parses the structured { stable, partial } payload", () => {
    expect(parsePreviewPayload({ stable: "hello ", partial: "world" })).toEqual(
      { stable: "hello ", partial: "world" },
    );
  });

  it("parses an empty streaming payload", () => {
    expect(parsePreviewPayload({ stable: "", partial: "" })).toEqual({
      stable: "",
      partial: "",
    });
  });

  it("falls back to a plain string payload as an all-volatile tail", () => {
    expect(parsePreviewPayload("legacy preview")).toEqual({
      stable: "",
      partial: "legacy preview",
    });
  });

  it("treats non-string fields as empty", () => {
    expect(parsePreviewPayload({ stable: 42, partial: null })).toEqual({
      stable: "",
      partial: "",
    });
  });

  it("never crashes on malformed payloads", () => {
    expect(parsePreviewPayload(null)).toEqual({ stable: "", partial: "" });
    expect(parsePreviewPayload(undefined)).toEqual({ stable: "", partial: "" });
    expect(parsePreviewPayload(123)).toEqual({ stable: "", partial: "" });
    expect(parsePreviewPayload({})).toEqual({ stable: "", partial: "" });
    expect(parsePreviewPayload({ stable: "only stable" })).toEqual({
      stable: "",
      partial: "",
    });
  });
});
