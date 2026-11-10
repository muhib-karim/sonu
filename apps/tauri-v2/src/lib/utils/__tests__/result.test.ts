import { describe, expect, it } from "vitest";
import type { Result } from "@/bindings";
import { unwrapResult } from "../result";

describe("unwrapResult", () => {
  it("returns the data of an ok result", () => {
    const result: Result<{ id: number }, string> = {
      status: "ok",
      data: { id: 7 },
    };

    expect(unwrapResult(result)).toEqual({ id: 7 });
  });

  it("returns falsy data unchanged", () => {
    expect(unwrapResult<null, string>({ status: "ok", data: null })).toBeNull();
    expect(unwrapResult<number, string>({ status: "ok", data: 0 })).toBe(0);
    expect(unwrapResult<string, string>({ status: "ok", data: "" })).toBe("");
  });

  it("throws an Error carrying the backend message for an error result", () => {
    const result: Result<string, string> = {
      status: "error",
      error: "history entry not found",
    };

    expect(() => unwrapResult(result)).toThrow(Error);
    expect(() => unwrapResult(result)).toThrow("history entry not found");
  });

  it("stringifies a non-string error value", () => {
    const result: Result<string, number> = { status: "error", error: 404 };

    expect(() => unwrapResult(result)).toThrow("404");
  });

  it("makes a resolved backend failure reach a try/catch", async () => {
    // The reason the helper exists: an awaited command does not reject for a
    // backend failure, so without unwrapping the catch block is dead code.
    const command = (): Promise<Result<null, string>> =>
      Promise.resolve({ status: "error", error: "disk full" });
    let caught: unknown;

    try {
      unwrapResult(await command());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("disk full");
  });
});
