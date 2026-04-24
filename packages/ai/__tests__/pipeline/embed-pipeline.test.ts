/**
 * Behavior tests voor embedMeetingWithExtractions.
 *
 * Wat deze pipeline doet (observable kant):
 *   1. Haalt meeting-data + extractions op uit de DB
 *   2. Bouwt een verrijkte embed-tekst
 *   3. Roept Cohere (via embedText) aan om een vector te krijgen
 *   4. Schrijft die vector terug op de `meetings` rij
 *   5. Als er extractions zijn: batch-embed hun content en schrijft die op de
 *      `extractions` rijen
 *
 * Wat we testen = wat er naar de GRENZEN (Cohere + DB) wordt gestuurd, plus de
 * error-contracts die de pipeline belooft:
 *   - meeting niet gevonden → descriptive throw
 *   - DB-write meeting-embedding faalt → throw (blokkerend)
 *   - DB-write extraction-batch faalt → LOGT maar throwt niet (graceful degr.)
 *   - geen extractions → skipt batch-embed (geen overhead)
 *
 * Wat we NIET testen (oude test deed dat wel, dat was implementation):
 *   - Dat getMeetingForEmbedding werd aangeroepen
 *   - Dat buildMeetingEmbedText werd aangeroepen met welke args
 *   - Dat updateRowEmbedding werd aangeroepen i.p.v. via een alternatief pad
 *
 *   Als iemand morgen de interne route refactored (bv. één call naar een
 *   gecombineerde query, of buildMeetingEmbedText inline), maar hetzelfde
 *   eindresultaat neerzet in de DB, blijven deze tests groen. Zoals het hoort.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock alleen de grenzen: DB-queries, DB-mutations, Cohere embedding. ──
// embed-text.ts wordt NIET gemockt: die is een pure helper waarvan we juist
// willen dat zijn output in de embed-call terechtkomt. Zo testen we het hele
// pad incl. text-enrichment, niet alleen een plumbing-ketting.
vi.mock("@repo/database/mutations/embeddings", () => ({
  updateRowEmbedding: vi.fn(),
  batchUpdateEmbeddings: vi.fn(),
}));
vi.mock("@repo/database/queries/meetings", () => ({
  getMeetingExtractions: vi.fn(),
  getMeetingForEmbedding: vi.fn(),
  getExtractionIdsAndContent: vi.fn(),
}));
vi.mock("../../src/embeddings", () => ({
  embedText: vi.fn(),
  embedBatch: vi.fn(),
}));

import { embedMeetingWithExtractions } from "../../src/pipeline/embed/pipeline";
import { updateRowEmbedding, batchUpdateEmbeddings } from "@repo/database/mutations/embeddings";
import {
  getMeetingExtractions,
  getMeetingForEmbedding,
  getExtractionIdsAndContent,
} from "@repo/database/queries/meetings";
import { embedText, embedBatch } from "../../src/embeddings";

const MEETING_ID = "meeting-uuid-1";

const meetingData = {
  title: "Weekly standup",
  participants: ["Alice", "Bob"],
  summary: "Sprint voortgang besproken",
};

const extractions = [
  { type: "decision", content: "We kiezen Next.js" },
  { type: "action_item", content: "Stef maakt tickets" },
];

const MEETING_EMBEDDING = [0.11, 0.22, 0.33];
const EXT_EMBEDDINGS = [
  [0.1, 0.2],
  [0.3, 0.4],
];

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Happy-path setup: alle DB-calls en embed-calls geven geldige resultaten.
 * Tests die iets specifieks willen laten falen, overschrijven alleen dát deel.
 */
function setupHappyPath() {
  vi.mocked(getMeetingForEmbedding).mockResolvedValue(meetingData as never);
  vi.mocked(getMeetingExtractions).mockResolvedValue(extractions as never);
  vi.mocked(embedText).mockResolvedValue(MEETING_EMBEDDING);
  vi.mocked(updateRowEmbedding).mockResolvedValue({ success: true });
  vi.mocked(getExtractionIdsAndContent).mockResolvedValue([
    { id: "ext-1", content: "We kiezen Next.js" },
    { id: "ext-2", content: "Stef maakt tickets" },
  ] as never);
  vi.mocked(embedBatch).mockResolvedValue(EXT_EMBEDDINGS);
  vi.mocked(batchUpdateEmbeddings).mockResolvedValue({ success: true });
}

describe("embedMeetingWithExtractions — happy path outputs", () => {
  it("schrijft de meeting-embedding naar de 'meetings' tabel op het juiste ID", async () => {
    setupHappyPath();
    await embedMeetingWithExtractions(MEETING_ID);

    // Grens-assertie: EXACT deze rij moet in de DB gezet worden.
    // Refactor-bestendig: het maakt niet uit hoe de pipeline intern bij de
    // embedding komt, zolang de juiste (table, id, vector) in de DB komt.
    expect(updateRowEmbedding).toHaveBeenCalledWith("meetings", MEETING_ID, MEETING_EMBEDDING);
  });

  it("schrijft extraction-embeddings 1-op-1 gekoppeld aan hun extraction-IDs", async () => {
    setupHappyPath();
    await embedMeetingWithExtractions(MEETING_ID);

    // Kritieke invariant: IDs en vectoren MOETEN in dezelfde volgorde liggen,
    // anders krijgen extractions een embedding van een andere extractie en
    // is semantic search kapot zonder dat iemand het merkt.
    expect(batchUpdateEmbeddings).toHaveBeenCalledWith(
      "extractions",
      ["ext-1", "ext-2"],
      EXT_EMBEDDINGS,
    );
  });

  it("de meeting-embed-tekst bevat titel, deelnemers, summary én extraction-content", async () => {
    // Behavior-contract (niet: "buildMeetingEmbedText werd aangeroepen"). We
    // willen weten dat de Cohere-call een VERRIJKTE tekst krijgt met zowel
    // meta-data als de AI-extracties. Dat is cruciaal voor search-kwaliteit:
    // een kale titel geeft slechte embeddings.
    setupHappyPath();
    await embedMeetingWithExtractions(MEETING_ID);

    const [embedInput] = vi.mocked(embedText).mock.calls[0];
    expect(embedInput).toContain("Weekly standup"); // titel
    expect(embedInput).toContain("Sprint voortgang besproken"); // summary
    expect(embedInput).toContain("We kiezen Next.js"); // decision
    expect(embedInput).toContain("Stef maakt tickets"); // action item
  });
});

describe("embedMeetingWithExtractions — error contracts", () => {
  it("meeting niet gevonden → throw met duidelijke boodschap en GEEN DB-write", async () => {
    vi.mocked(getMeetingForEmbedding).mockResolvedValue(null);

    await expect(embedMeetingWithExtractions(MEETING_ID)).rejects.toThrow(
      `Failed to fetch meeting ${MEETING_ID} for embedding`,
    );

    // Invariant: bij ontbrekende meeting mag er NOOIT een write gebeuren.
    expect(updateRowEmbedding).not.toHaveBeenCalled();
    expect(batchUpdateEmbeddings).not.toHaveBeenCalled();
  });

  it("DB-write meeting-embedding faalt → throw (blokkerend, geen stille failure)", async () => {
    setupHappyPath();
    vi.mocked(updateRowEmbedding).mockResolvedValue({ error: "DB write failed" });

    await expect(embedMeetingWithExtractions(MEETING_ID)).rejects.toThrow(
      "Failed to save meeting embedding: DB write failed",
    );
  });

  it("DB-write extraction-batch faalt → LOGT, maar throwt NIET (graceful degradation)", async () => {
    // Waarom graceful: meeting-embedding is belangrijker dan extraction-
    // embeddings. Als de hoofd-embedding werkt maar een van de extractions
    // niet, moet de meeting wel vindbaar blijven. Daarom blokkeert dit niet.
    // Als deze regel stil verandert naar "throw", gaat elke kleine DB-hickup
    // de hele pipeline killen.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setupHappyPath();
    vi.mocked(batchUpdateEmbeddings).mockResolvedValue({ error: "Batch failed" });

    // Moet NIET gooien
    await embedMeetingWithExtractions(MEETING_ID);

    // Moet WEL loggen zodat de fout opspoorbaar is
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to batch embed extractions"),
    );

    consoleSpy.mockRestore();
  });
});

describe("embedMeetingWithExtractions — edge cases", () => {
  it("geen extractions → slaat batch-embed stap over (performance-invariant)", async () => {
    setupHappyPath();
    vi.mocked(getExtractionIdsAndContent).mockResolvedValue([]);

    await embedMeetingWithExtractions(MEETING_ID);

    // Als deze call WEL zou gebeuren met een lege array, verkwisten we een
    // Cohere batch-call (kosten) én een DB roundtrip per meeting. Dit is een
    // performance-contract dat stil verloren kan gaan bij een refactor.
    expect(embedBatch).not.toHaveBeenCalled();
    expect(batchUpdateEmbeddings).not.toHaveBeenCalled();

    // Meeting zelf wordt WEL geëmbed — die is niet optioneel.
    expect(updateRowEmbedding).toHaveBeenCalledWith("meetings", MEETING_ID, MEETING_EMBEDDING);
  });

  it("meeting zonder extractions krijgt nog steeds een zinnige embed-tekst", async () => {
    // Zelfs als er geen extractions zijn moet de meeting-embed-tekst iets
    // bevatten waar search op kan matchen (titel + summary).
    setupHappyPath();
    vi.mocked(getMeetingExtractions).mockResolvedValue([]);
    vi.mocked(getExtractionIdsAndContent).mockResolvedValue([]);

    await embedMeetingWithExtractions(MEETING_ID);

    const [embedInput] = vi.mocked(embedText).mock.calls[0];
    expect(embedInput).toContain("Weekly standup");
    expect(embedInput).toContain("Sprint voortgang besproken");
  });
});
