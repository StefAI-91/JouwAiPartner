import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RISK_SPECIALIST_SYSTEM_PROMPT } from "../../src/agents/risk-specialist";

/**
 * Prompt-sync test (PW-QC-03 AI-QC-006 / QUAL-QC-021).
 *
 * De agents laden hun system-prompt runtime uit packages/ai/prompts/*.md.
 * Deze test borgt:
 *
 *   1. De markdown-bestanden bestaan en zijn niet leeg.
 *   2. De geëxporteerde *_SYSTEM_PROMPT-constante bevat exact de markdown-
 *      inhoud (trimEnd) — zodat iedere regressie waarbij iemand per
 *      ongeluk opnieuw een inline-string introduceert direct faalt.
 *   3. Er staat géén inline `const SYSTEM_PROMPT = \`...\`;` meer in de
 *      agent-bestanden. Als iemand dat terugzet gaat deze test rood.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = resolve(HERE, "../../prompts");

function readPrompt(name: string): string {
  return readFileSync(resolve(PROMPTS_DIR, name), "utf8").trimEnd();
}

describe("prompt sync (single source of truth)", () => {
  it("risk_specialist.md bestaat en is niet leeg", () => {
    const md = readPrompt("risk_specialist.md");
    expect(md.length).toBeGreaterThan(100);
  });

  it("RISK_SPECIALIST_SYSTEM_PROMPT matcht risk_specialist.md (trimEnd)", () => {
    expect(RISK_SPECIALIST_SYSTEM_PROMPT).toBe(readPrompt("risk_specialist.md"));
  });

  it("geen inline `const SYSTEM_PROMPT = \\`…\\`` in risk-specialist agent", () => {
    // Regressie-guard: als iemand de runtime-load ongedaan maakt en een
    // inline template-literal terugzet, moet deze test rood gaan.
    const path = resolve(HERE, "../../src/agents/risk-specialist.ts");
    const src = readFileSync(path, "utf8");
    expect(src, `${path} mag geen inline SYSTEM_PROMPT template-literal bevatten`).not.toMatch(
      /const SYSTEM_PROMPT\s*=\s*`/,
    );
  });
});
