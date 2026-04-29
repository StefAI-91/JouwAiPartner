import { describe, it, expect } from "vitest";
import { widgetIngestSchema } from "../../src/validations/widget";

// Geldige v4 UUID (zelfde patroon als JAIP Platform-project: positie 13 = '4',
// positie 17 ∈ ['8','9','a','b']). Test-IDs uit `helpers/seed.ts` zijn nil-vorm
// en zouden door Zod worden afgewezen — die worden alleen in DB-tests gebruikt.
const validBody = {
  project_id: "00000000-0000-4000-8000-000000000001",
  type: "bug" as const,
  description: "Een bug die ik tegenkwam op de dashboard pagina.",
  context: {
    url: "https://cockpit.jouw-ai-partner.nl/dashboard",
    viewport: { width: 1920, height: 1080 },
    user_agent: "Mozilla/5.0",
  },
  reporter_email: "stef@jouw-ai-partner.nl",
};

describe("widgetIngestSchema", () => {
  it("accepts a fully valid payload", () => {
    expect(widgetIngestSchema.safeParse(validBody).success).toBe(true);
  });

  it("accepts payload without reporter_email (anoniem)", () => {
    const { reporter_email: _omit, ...rest } = validBody;
    expect(widgetIngestSchema.safeParse(rest).success).toBe(true);
  });

  it("accepts reporter_email = null", () => {
    expect(widgetIngestSchema.safeParse({ ...validBody, reporter_email: null }).success).toBe(true);
  });

  it("rejects non-uuid project_id", () => {
    const result = widgetIngestSchema.safeParse({ ...validBody, project_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported type values", () => {
    const result = widgetIngestSchema.safeParse({ ...validBody, type: "rant" });
    expect(result.success).toBe(false);
  });

  it("rejects description shorter than 10 chars", () => {
    expect(widgetIngestSchema.safeParse({ ...validBody, description: "kort" }).success).toBe(false);
  });

  it("rejects description longer than 10000 chars", () => {
    const huge = "x".repeat(10001);
    expect(widgetIngestSchema.safeParse({ ...validBody, description: huge }).success).toBe(false);
  });

  it("rejects malformed context.url", () => {
    const result = widgetIngestSchema.safeParse({
      ...validBody,
      context: { ...validBody.context, url: "not-a-url" },
    });
    expect(result.success).toBe(false);
  });

  it("trims description whitespace", () => {
    const result = widgetIngestSchema.safeParse({
      ...validBody,
      description: "   precies tien tekens leesbaar   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe("precies tien tekens leesbaar");
    }
  });

  it("rejects negative viewport dimensions", () => {
    const result = widgetIngestSchema.safeParse({
      ...validBody,
      context: { ...validBody.context, viewport: { width: -1, height: 1080 } },
    });
    expect(result.success).toBe(false);
  });
});
