/**
 * Behavior tests voor de MCP server.
 *
 * De vorige versie van deze test (zie git-historie) dook in de private velden
 * `_registeredTools` en `_registeredPrompts` van de MCP SDK om te controleren
 * of er exact 16 tools stonden. Dat was een klassieke implementation test:
 *   - Breekt zonder reden zodra de SDK private velden hernoemt
 *   - Breekt zodra we bewust een tool toevoegen (geen echte bug, toch rood)
 *   - Zegt niks over of de tools DOEN wat ze moeten doen
 *
 * Deze versie test dingen die ECHT stuk mogen gaan:
 *   1. Server initialiseert zonder te crashen (smoketest, realistisch)
 *   2. De kennisbasis-prompt bevat de kritieke honesty-contract regels:
 *        - "geen antwoord zonder bron"
 *        - "verzin geen informatie"
 *      Als iemand die eruit haalt of afzwakt, gaat de test om. Dat is precies
 *      de soort regressie waar een non-coder niet op kan reviewen via UI.
 *   3. De lijst kritieke-core tools is geregistreerd — een tripwire zodat een
 *      stille tool-verwijdering niet onopgemerkt blijft. We tellen NIET tot
 *      een exact getal (dat zou breken bij elke nieuwe tool), we checken
 *      alleen dat de core-set intact is.
 *
 * Het contrast met de vorige test (en waarom dit niet te "launderen" is):
 *   Bij de oude test kon Claude simpel de count aanpassen (16 → 17) zodra een
 *   tool toegevoegd werd. Bij deze test moet hij de *prompt-inhoud* intact
 *   houden en mogen de tools niet zomaar verdwijnen — inhoudelijke garanties.
 */
import { describe, it, expect, vi } from "vitest";

// Mock de DB-grens. We instantiëren de server hier, en sommige tool-bestanden
// importeren `@repo/database/supabase/admin` op module-niveau. Die mocks
// voorkomen dat importeren van server.ts een Supabase client probeert op te
// zetten zonder env vars.
vi.mock("@repo/database/supabase/admin", () => ({
  getAdminClient: vi.fn(() => ({})),
}));

vi.mock("@repo/ai/embeddings", () => ({
  embedText: vi.fn(async () => []),
}));

vi.mock("@repo/database/queries/people", () => ({
  findPersonIdsByName: vi.fn(async () => []),
  findProfileIdByName: vi.fn(async () => null),
}));

vi.mock("@repo/database/mutations/extractions", () => ({
  getExtractionForCorrection: vi.fn(async () => null),
  correctExtraction: vi.fn(async () => ({ success: true })),
  deleteExtractionsByMeetingId: vi.fn(async () => ({ success: true })),
  insertExtractions: vi.fn(async () => ({ success: true })),
}));

vi.mock("@repo/database/mutations/tasks", () => ({
  createTaskFromExtraction: vi.fn(async () => ({ success: true, id: "test" })),
  updateTask: vi.fn(async () => ({ success: true })),
  completeTask: vi.fn(async () => ({ success: true })),
  dismissTask: vi.fn(async () => ({ success: true })),
}));

vi.mock("@repo/database/mutations/meetings", () => ({
  insertManualMeeting: vi.fn(async () => ({ success: true })),
}));

import { createMcpServer } from "../src/server";

/**
 * Core tool-set die ALTIJD moet bestaan — verwijdering van een van deze zou
 * een breaking change zijn voor elke bestaande Claude-sessie die de MCP
 * gebruikt. Deze lijst is bewust een SUBSET van alle tools (niet de hele
 * lijst) zodat nieuwe tools toevoegen niet meteen een testwijziging vereist,
 * maar een stille verwijdering WEL direct opvalt.
 */
const CRITICAL_TOOLS = [
  "search_knowledge",
  "get_meeting_summary",
  "get_tasks",
  "get_organizations",
  "get_projects",
  "get_people",
] as const;

/**
 * Helper: haal de geregistreerde tool-namen op uit de MCP SDK.
 * Ja — dit leest nog steeds private veld `_registeredTools`. Dat is een
 * bewuste concessie: de MCP SDK biedt geen publieke lijst-API. Maar omdat
 * we alleen controleren of een vaste *subset* aanwezig is (niet de hele
 * lijst tellen), is deze test nog steeds robuust tegen normale uitbreiding.
 */
function listRegisteredToolNames(server: ReturnType<typeof createMcpServer>): string[] {
  const registered = (server as Record<string, unknown>)._registeredTools as
    | Map<string, unknown>
    | Record<string, unknown>
    | undefined;
  if (!registered) return [];
  if (registered instanceof Map) return [...registered.keys()];
  return Object.keys(registered);
}

describe("createMcpServer — initialization", () => {
  it("initialiseert zonder te crashen", () => {
    // Smoketest: alle tool-registraties mogen geen runtime errors opleveren.
    expect(() => createMcpServer()).not.toThrow();
  });

  it("registreert de kritieke core-tools (tripwire tegen stille verwijdering)", () => {
    const server = createMcpServer();
    const names = listRegisteredToolNames(server);

    for (const required of CRITICAL_TOOLS) {
      expect(names, `expected core tool '${required}' to be registered`).toContain(required);
    }
  });
});

describe("kennisbasis-context prompt — honesty contract", () => {
  /**
   * Haal de tekst van de geregistreerde prompt op.
   * We testen de prompt-*inhoud*, want dat is het enige gedragscontract dat
   * de MCP server aan consumers geeft: "hoe moet je mijn kennisbasis
   * gebruiken". Als deze tekst afzwakt, gaan klant-assistenten stiekem
   * minder betrouwbaar worden.
   */
  async function getPromptText(): Promise<string> {
    const server = createMcpServer();
    const registered = (server as Record<string, unknown>)._registeredPrompts as
      | Map<string, { callback: () => Promise<unknown> }>
      | Record<string, { callback: () => Promise<unknown> }>
      | undefined;

    const entry =
      registered instanceof Map
        ? registered.get("kennisbasis-context")
        : registered?.["kennisbasis-context"];

    if (!entry) throw new Error("kennisbasis-context prompt niet gevonden");

    const result = (await entry.callback()) as {
      messages: { content: { text: string } }[];
    };
    return result.messages[0].content.text;
  }

  it("bevat de regel 'geen antwoord zonder bron' (kern van verification model)", async () => {
    const text = await getPromptText();
    // CLAUDE.md sectie "Key Design Principles": verification before truth.
    // Deze zin IS dat contract naar de LLM. Als iemand hem weghaalt mogen
    // we hallucinaties verwachten en kan niemand het zien tot een klant klaagt.
    expect(text.toLowerCase()).toContain("nooit");
    expect(text.toLowerCase()).toMatch(/zonder bron|herleidbaar/);
  });

  it("verplicht de LLM om bij ontbrekende info expliciet te zeggen dat hij het niet weet", async () => {
    const text = await getPromptText();
    // Anti-hallucinatie: de prompt MOET de "ik weet het niet"-optie expliciet
    // toestaan. Zonder deze regel vult de LLM gaten met verzonnen content.
    expect(text).toMatch(/geen informatie over|ik weet het niet|heb ik geen/i);
  });

  it("instrueert de LLM om bronvermelding (meeting titel/datum) te geven", async () => {
    const text = await getPromptText();
    expect(text.toLowerCase()).toContain("meeting");
    expect(text.toLowerCase()).toMatch(/titel|datum|bron/);
  });
});
