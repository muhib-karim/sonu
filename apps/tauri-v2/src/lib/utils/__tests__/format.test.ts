import { describe, it, expect } from "vitest";
import { formatModelSize } from "../format";

describe("formatModelSize", () => {
  it('should return "Unknown size" for null', () => {
    expect(formatModelSize(null)).toBe("Unknown size");
  });

  it('should return "Unknown size" for undefined', () => {
    expect(formatModelSize(undefined)).toBe("Unknown size");
  });

  it('should return "Unknown size" for zero', () => {
    expect(formatModelSize(0)).toBe("Unknown size");
  });

  it('should return "Unknown size" for negative numbers', () => {
    expect(formatModelSize(-1)).toBe("Unknown size");
  });

  it('should return "Unknown size" for non-finite numbers', () => {
    expect(formatModelSize(Infinity)).toBe("Unknown size");
    expect(formatModelSize(NaN)).toBe("Unknown size");
  });

  it("should format small sizes in MB with 1 decimal", () => {
    expect(formatModelSize(50)).toMatch(/50\.0 MB/);
  });

  it("should format medium sizes in MB without decimals", () => {
    expect(formatModelSize(150)).toBe("150 MB");
  });

  it("should format sizes in GB with 1 decimal for small GB values", () => {
    expect(formatModelSize(1536)).toMatch(/1\.5 GB/);
  });

  it("should format sizes in GB without decimals for large values", () => {
    expect(formatModelSize(10240)).toBe("10 GB");
  });

  it("should format exactly 1024 MB as 1 GB", () => {
    expect(formatModelSize(1024)).toMatch(/1\.0 GB/);
  });
});
