import { describe, it, expect } from "vitest";
import { escapeLike, formatVerificatieStatus, collectVerifiedByIds } from "../src/tools/utils";

describe("escapeLike", () => {
  it("escapes % characters", () => {
    expect(escapeLike("100%")).toBe("100\\%");
  });

  it("escapes _ characters", () => {
    expect(escapeLike("some_value")).toBe("some\\_value");
  });

  it("escapes both % and _ characters", () => {
    expect(escapeLike("50%_done")).toBe("50\\%\\_done");
  });

  it("returns unchanged string without special characters", () => {
    expect(escapeLike("normal text")).toBe("normal text");
  });
});

describe("formatVerificatieStatus", () => {
  it("returns verified with name and date", () => {
    const result = formatVerificatieStatus("verified", "Stef", "2025-01-15T10:00:00Z", null, null);
    expect(result).toContain("Verified by Stef");
    expect(result).toContain("on");
  });

  it("returns verified with name only", () => {
    const result = formatVerificatieStatus("verified", "Stef", null, null, null);
    expect(result).toBe("Verified by Stef");
  });

  it("returns verified with date only", () => {
    const result = formatVerificatieStatus("verified", null, "2025-01-15T10:00:00Z", null, null);
    expect(result).toContain("Verified on");
  });

  it("returns plain Verified without name or date", () => {
    const result = formatVerificatieStatus("verified", null, null, null, null);
    expect(result).toBe("Verified");
  });

  it("returns Rejected for rejected status", () => {
    const result = formatVerificatieStatus("rejected", null, null, null, null);
    expect(result).toBe("Rejected");
  });

  it("returns corrected status when correctedBy is set", () => {
    const result = formatVerificatieStatus(null, null, null, null, "user-123");
    expect(result).toBe("Corrected (verification pending)");
  });

  it("returns AI draft with confidence", () => {
    const result = formatVerificatieStatus(null, null, null, 0.85, null);
    expect(result).toBe("AI draft (confidence: 85%)");
  });

  it("returns Draft as fallback", () => {
    const result = formatVerificatieStatus(null, null, null, null, null);
    expect(result).toBe("Draft");
  });
});

describe("collectVerifiedByIds", () => {
  it("extracts unique non-null IDs", () => {
    const items = [
      { verified_by: "user-1" },
      { verified_by: "user-2" },
      { verified_by: "user-1" },
      { verified_by: null },
    ];
    const result = collectVerifiedByIds(items);
    expect(result).toHaveLength(2);
    expect(result).toContain("user-1");
    expect(result).toContain("user-2");
  });

  it("returns empty array when all verified_by are null", () => {
    const items = [{ verified_by: null }, { verified_by: null }];
    expect(collectVerifiedByIds(items)).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    expect(collectVerifiedByIds([])).toEqual([]);
  });

  it("handles items without verified_by property", () => {
    const items = [{}, { verified_by: "user-1" }];
    const result = collectVerifiedByIds(items);
    expect(result).toEqual(["user-1"]);
  });
});
