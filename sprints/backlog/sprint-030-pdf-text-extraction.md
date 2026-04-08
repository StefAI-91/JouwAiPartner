# Sprint 030: PDF Tekstextractie

## Doel

PDF-bijlagen uit emails verwerken tot doorzoekbare tekst. Gebruikt `pdf-parse` (of `unpdf`) om tekst te extraheren uit PDF-bestanden die in Supabase Storage staan. De geëxtraheerde tekst wordt opgeslagen in `email_attachments.extracted_text` en meegenomen in de AI extraction pipeline.

## Requirements

| ID      | Beschrijving                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------- |
| PDF-001 | Tekst extraheren uit PDF-bestanden via server-side library                                      |
| PDF-002 | Ondersteuning voor multi-page PDF's (tekst van alle pagina's samenvoegen)                       |
| PDF-003 | Maximale tekst limiet: 50.000 karakters per PDF (truncate met indicatie)                        |
| PDF-004 | Foutafhandeling: corrupte/password-protected PDF's markeren als `failed` met duidelijke melding |
| PDF-005 | Geëxtraheerde tekst opslaan in `email_attachments.extracted_text`                               |
| PDF-006 | Processing status correct bijwerken (processing → processed / failed)                           |
| PDF-007 | Embedding genereren voor extracted_text via Cohere                                              |

## Context

### Technische keuze: `pdf-parse`

```bash
npm install pdf-parse
```

- Mature library, 3M+ weekly downloads
- Werkt server-side (Node.js), geen browser dependencies
- Extraheert tekst per pagina, behoudt leesvolgorde
- Geeft metadata terug (pagina-telling, info)
- Alternatief: `unpdf` (lichter, gebaseerd op Mozilla's pdf.js)

### Hoe het werkt

```typescript
import pdfParse from "pdf-parse";

async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const result = await pdfParse(buffer);
  return {
    text: result.text, // alle pagina's samengevoegd
    pageCount: result.numpages,
  };
}
```

### Flow

```
1. getPendingAttachments(mime_type = 'application/pdf')
2. Download binary uit Supabase Storage (via storage_path)
3. pdfParse(buffer) → tekst + metadata
4. Truncate naar 50.000 karakters indien nodig
5. updateExtractedText(attachmentId, text)
6. updateAttachmentStatus(attachmentId, 'processed')
7. Embed extracted_text via Cohere
```

### Edge cases

| Case                             | Afhandeling                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Password-protected PDF           | `processing_status: 'failed'`, `processing_error: 'Password-protected PDF'`          |
| Corrupte PDF                     | `processing_status: 'failed'`, `processing_error: 'Failed to parse PDF: {error}'`    |
| Scan/image-only PDF (geen tekst) | `processing_status: 'processed'`, `extracted_text: null` (geen OCR in v1)            |
| PDF > 50.000 karakters           | Truncate + append `\n\n[Tekst afgekapt na 50.000 karakters, origineel: X karakters]` |
| Lege PDF                         | `processing_status: 'processed'`, `extracted_text: null`                             |

### Image-only PDF's (scans)

In v1 doen we **geen OCR**. `pdf-parse` retourneert een lege string voor scan-only PDF's. Dit is acceptabel — de bijlage wordt als `processed` gemarkeerd met lege tekst. OCR (via Tesseract of Claude Vision) is een v3+ feature.

## Prerequisites

- [ ] Sprint 029 (email attachments fundament) moet afgerond zijn

## Taken

- [ ] `pdf-parse` package installeren in `packages/ai`
- [ ] `packages/ai/src/pipeline/extractors/pdf-extractor.ts` aanmaken: extractTextFromPdf(buffer) → { text, pageCount }
- [ ] Truncatie logica: max 50.000 karakters met indicatie
- [ ] Registreer PDF handler in de `extractTextFromAttachment()` dispatcher uit sprint 029
- [ ] Error handling: password-protected, corrupte, lege PDF's correct afvangen
- [ ] Testen met diverse PDF types: tekst, multi-page, scan-only, corrupt

## Acceptatiecriteria

- [ ] [PDF-001] Tekst wordt correct geëxtraheerd uit standaard PDF-bestanden
- [ ] [PDF-002] Multi-page PDF's: tekst van alle pagina's wordt samengevoegd
- [ ] [PDF-003] PDF's met > 50.000 karakters worden correct afgekapt met indicatie
- [ ] [PDF-004] Corrupte en password-protected PDF's worden als `failed` gemarkeerd met foutmelding
- [ ] [PDF-005] Geëxtraheerde tekst staat in `email_attachments.extracted_text`
- [ ] [PDF-006] Processing status lifecycle werkt correct
- [ ] [PDF-007] Embedding wordt gegenereerd voor extracted_text

## Geraakt door deze sprint

- `packages/ai/package.json` (gewijzigd — pdf-parse dependency)
- `packages/ai/src/pipeline/extractors/pdf-extractor.ts` (nieuw)
- `packages/ai/src/pipeline/attachment-processor.ts` (gewijzigd — PDF handler registreren)
