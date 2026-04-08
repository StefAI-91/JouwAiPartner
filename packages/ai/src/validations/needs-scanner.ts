import { z } from "zod";

export const NeedItemSchema = z.object({
  content: z.string().describe("De behoefte, beknopt en concreet geformuleerd in het Nederlands"),
  category: z
    .enum(["tooling", "kennis", "capaciteit", "proces", "klant", "overig"])
    .describe(
      "tooling: software/tools/infra nodig. kennis: training/expertise/documentatie nodig. capaciteit: mensen/budget/tijd nodig. proces: procesverbetering nodig. klant: klantwens/requirement. overig: past niet in andere categorieën.",
    ),
  priority: z
    .enum(["laag", "midden", "hoog"])
    .describe(
      "laag: nice-to-have, geen urgentie. midden: belangrijk maar niet urgent. hoog: blokkerend of urgent.",
    ),
  context: z
    .string()
    .describe("Korte uitleg waarom dit als behoefte is geidentificeerd, max 1-2 zinnen"),
  source_quote: z
    .string()
    .nullable()
    .describe(
      "Relevante passage uit de samenvatting die deze behoefte onderbouwt. Null als niet vindbaar.",
    ),
});

export const NeedsScannerOutputSchema = z.object({
  needs: z
    .array(NeedItemSchema)
    .describe("Alle geidentificeerde behoeftes uit de meeting samenvatting"),
  scan_notes: z
    .string()
    .nullable()
    .describe(
      "Optionele opmerking als er iets opvalt aan de samenvatting (te vaag, geen behoeftes, etc.)",
    ),
});

export type NeedItem = z.infer<typeof NeedItemSchema>;
export type NeedsScannerOutput = z.infer<typeof NeedsScannerOutputSchema>;
