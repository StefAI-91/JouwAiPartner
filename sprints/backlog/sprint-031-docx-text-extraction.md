# Sprint 031: DOCX Tekstextractie

## Doel

DOCX-bijlagen uit emails verwerken tot doorzoekbare tekst. Gebruikt `mammoth` om Word-documenten te converteren naar clean tekst. De geëxtraheerde tekst wordt opgeslagen in `email_attachments.extracted_text` en meegenomen in de AI extraction pipeline.

## Requirements

| ID       | Beschrijving                                                                   |
| -------- | ------------------------------------------------------------------------------ |
| DOCX-001 | Tekst extraheren uit DOCX-bestanden via `mammoth` library                      |
| DOCX-002 | Documentstructuur behouden: headings, lijsten en paragrafen als leesbare tekst |
| DOCX-003 | Tabellen converteren naar leesbare tekstrepresentatie                          |
| DOCX-004 | Maximale tekst limiet: 50.000 karakters per document (truncate met indicatie)  |
| DOCX-005 | Foutafhandeling: corrupte/password-protected DOCX markeren als `failed`        |
| DOCX-006 | Geëxtraheerde tekst opslaan in `email_attachments.extracted_text`              |
| DOCX-007 | Processing status correct bijwerken (processing → processed / failed)          |
| DOCX-008 | Embedding genereren voor extracted_text via Cohere                             |

## Context

### Technische keuze: `mammoth`

```bash
npm install mammoth
```

- Gespecialiseerd in DOCX → tekst/HTML conversie
- Behoudt documentstructuur (headings, lijsten, tabellen)
- Negeert styling (fonts, kleuren) — perfect voor AI processing
- Stabiel, 500K+ weekly downloads
- Alternatief: `docx-parser` (minder volwassen)

### Hoe het werkt

```typescript
import mammoth from "mammoth";

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  // extractRawText geeft plain tekst zonder HTML
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
```

**Twee opties:**

- `mammoth.extractRawText()` — plain text, simpel, verliest structuur
- `mammoth.convertToHtml()` → strip tags — behoudt headings/lijsten als structuur

Aanbeveling: gebruik `convertToHtml()` en converteer naar structured plain text. Dit geeft de AI extractor meer context over de documentstructuur.

### Flow

```
1. getPendingAttachments(mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
2. Download binary uit Supabase Storage (via storage_path)
3. mammoth.convertToHtml({ buffer }) → HTML
4. HTML → structured plain text (headings als ##, lijsten als -, tabellen als rijen)
5. Truncate naar 50.000 karakters indien nodig
6. updateExtractedText(attachmentId, text)
7. updateAttachmentStatus(attachmentId, 'processed')
8. Embed extracted_text via Cohere
```

### HTML naar structured text conversie

```typescript
// Voorbeeld output:
// ## Projectplan Q2
//
// Doelstellingen:
// - Revenue target: €500K
// - 3 nieuwe klanten
//
// | Fase | Deadline | Status |
// | Discovery | 15 april | Actief |
// | Proposal | 1 mei | Gepland |
```

Dit behoudt genoeg structuur voor de AI om context te begrijpen, zonder HTML overhead.

### Edge cases

| Case                           | Afhandeling                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Password-protected DOCX        | `processing_status: 'failed'`, `processing_error: 'Password-protected document'`   |
| Corrupte DOCX                  | `processing_status: 'failed'`, `processing_error: 'Failed to parse DOCX: {error}'` |
| DOCX met alleen afbeeldingen   | `processing_status: 'processed'`, `extracted_text: null` of minimale tekst         |
| DOCX > 50.000 karakters        | Truncate + indicatie                                                               |
| Oude .doc formaat (niet .docx) | `processing_status: 'skipped'` — mammoth ondersteunt alleen .docx                  |
| DOCX met embedded objecten     | Objecten worden genegeerd, tekst wordt wel geëxtraheerd                            |

### .doc vs .docx

`mammoth` ondersteunt alleen het moderne `.docx` formaat (Office 2007+). Het oude `.doc` binaire formaat wordt **niet** ondersteund. Oude `.doc` bestanden krijgen `processing_status: 'skipped'` met een duidelijke melding. Dit is acceptabel — `.doc` wordt steeds zeldzamer.

## Prerequisites

- [ ] Sprint 029 (email attachments fundament) moet afgerond zijn

## Taken

- [ ] `mammoth` package installeren in `packages/ai`
- [ ] `packages/ai/src/pipeline/extractors/docx-extractor.ts` aanmaken: extractTextFromDocx(buffer) → string
- [ ] HTML → structured plain text converter (headings, lijsten, tabellen)
- [ ] Truncatie logica: max 50.000 karakters met indicatie
- [ ] Registreer DOCX handler in de `extractTextFromAttachment()` dispatcher uit sprint 029
- [ ] Error handling: corrupte, password-protected, .doc (oud formaat) correct afvangen
- [ ] Testen met diverse DOCX types: simpel, tabellen, lijsten, afbeeldingen, corrupt

## Acceptatiecriteria

- [ ] [DOCX-001] Tekst wordt correct geëxtraheerd uit standaard DOCX-bestanden
- [ ] [DOCX-002] Headings, lijsten en paragrafen zijn herkenbaar in de output
- [ ] [DOCX-003] Tabellen worden als leesbare tekst gerepresenteerd
- [ ] [DOCX-004] Documenten met > 50.000 karakters worden correct afgekapt
- [ ] [DOCX-005] Corrupte bestanden worden als `failed` gemarkeerd met foutmelding
- [ ] [DOCX-006] Geëxtraheerde tekst staat in `email_attachments.extracted_text`
- [ ] [DOCX-007] Processing status lifecycle werkt correct
- [ ] [DOCX-008] Embedding wordt gegenereerd voor extracted_text

## Geraakt door deze sprint

- `packages/ai/package.json` (gewijzigd — mammoth dependency)
- `packages/ai/src/pipeline/extractors/docx-extractor.ts` (nieuw)
- `packages/ai/src/pipeline/attachment-processor.ts` (gewijzigd — DOCX handler registreren)
