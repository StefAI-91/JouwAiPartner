# Sprint 032: Plain Text Extractie (TXT, MD, CSV, HTML)

## Doel

Tekstgebaseerde bijlagen uit emails verwerken. Deze types zijn al tekst — er is geen complexe parsing nodig. De focus ligt op slimme cleaning: HTML-tags strippen, CSV leesbaar maken, en Markdown behouden. De geëxtraheerde tekst wordt opgeslagen in `email_attachments.extracted_text`.

## Requirements

| ID      | Beschrijving                                                                 |
| ------- | ---------------------------------------------------------------------------- |
| TXT-001 | `.txt` bestanden: content direct overnemen als extracted_text                |
| TXT-002 | `.md` bestanden: Markdown content behouden (structuur is waardevol voor AI)  |
| TXT-003 | `.csv` bestanden: converteren naar leesbare tabel-representatie              |
| TXT-004 | `.html` bestanden: HTML tags strippen, tekst behouden met structuur          |
| TXT-005 | Encoding detectie: UTF-8 als default, fallback voor andere encodings         |
| TXT-006 | Maximale tekst limiet: 50.000 karakters per bestand (truncate met indicatie) |
| TXT-007 | Geëxtraheerde tekst opslaan in `email_attachments.extracted_text`            |
| TXT-008 | Processing status correct bijwerken (processing → processed / failed)        |
| TXT-009 | Embedding genereren voor extracted_text via Cohere                           |

## Context

### Waarom een aparte sprint?

Hoewel deze types "simpel" lijken, zijn er nuances:

- **CSV** heeft structuur die leesbaar gemaakt moet worden voor AI
- **HTML** moet intelligent gestript worden (niet alle tags zijn gelijk)
- **Encoding** kan variëren (Windows-1252, ISO-8859-1, UTF-8)
- Alle types delen dezelfde truncatie- en opslaglogica

### Per type: aanpak

#### TXT (text/plain)

Simpelst mogelijke geval. Buffer → string (UTF-8). Geen transformatie nodig.

```typescript
function extractTextFromTxt(buffer: Buffer): string {
  return buffer.toString("utf-8");
}
```

#### Markdown (text/markdown)

Behoud de Markdown as-is. De structuur (headings, lijsten, code blocks) is waardevolle context voor de AI extractor. Geen conversie nodig.

```typescript
function extractTextFromMarkdown(buffer: Buffer): string {
  return buffer.toString("utf-8");
}
```

#### CSV (text/csv)

Converteer naar leesbare tekst. Twee strategieën:

**Kleine CSV (< 50 rijen):** tabel-representatie

```
| Naam | Rol | Uren |
| Jan | Developer | 32 |
| Piet | Designer | 24 |
```

**Grote CSV (50+ rijen):** header + eerste 50 rijen + samenvatting

```
Kolommen: Naam, Rol, Uren, Project, Status
[50 van 1.247 rijen getoond]

| Naam | Rol | Uren | Project | Status |
| Jan | Developer | 32 | Platform | Actief |
...
```

Geen externe library nodig — simpele split op `,` en `\n`. Complexe CSV's (quoted fields met komma's) kunnen `csv-parse` gebruiken als fallback.

#### HTML (text/html)

Strip tags maar behoud structuur:

- `<h1>`-`<h6>` → `## Heading` (met newlines)
- `<p>` → dubbele newline
- `<li>` → `- item`
- `<br>` → newline
- `<table>` → tabel-representatie
- `<script>`, `<style>`, `<nav>`, `<footer>` → volledig verwijderen
- Rest → alleen tekst behouden

Geen externe library nodig voor basis HTML stripping. Bij complexe HTML kan `htmlparser2` of `cheerio` gebruikt worden.

### Flow (alle types)

```
1. getPendingAttachments(mime_type IN ('text/plain', 'text/markdown', 'text/csv', 'text/html'))
2. Download binary uit Supabase Storage
3. Decode buffer naar string (UTF-8, met encoding detectie)
4. Type-specifieke transformatie (strip, format, etc.)
5. Truncate naar 50.000 karakters indien nodig
6. updateExtractedText(attachmentId, text)
7. updateAttachmentStatus(attachmentId, 'processed')
8. Embed extracted_text via Cohere
```

### Edge cases

| Case                             | Afhandeling                                              |
| -------------------------------- | -------------------------------------------------------- |
| Niet-UTF-8 encoding              | Detecteer via BOM of heuristiek, fallback naar latin1    |
| Leeg bestand                     | `processing_status: 'processed'`, `extracted_text: null` |
| Enorm CSV (10K+ rijen)           | Truncate na 50 rijen + samenvatting                      |
| HTML met veel scripts/style      | Volledig strippen, alleen content text behouden          |
| Binair bestand met .txt extensie | Detecteer niet-printbare karakters, markeer als `failed` |
| CSV met inconsistente kolommen   | Best-effort parsing, geen error                          |

### Encoding detectie

```typescript
function decodeBuffer(buffer: Buffer): string {
  // Check for BOM (Byte Order Mark)
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString("utf-8"); // UTF-8 BOM
  }
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le"); // UTF-16 LE
  }
  // Default: UTF-8 (meest voorkomend)
  const text = buffer.toString("utf-8");
  // Sanity check: als er veel replacement characters zijn, probeer latin1
  if ((text.match(/\uFFFD/g) || []).length > text.length * 0.01) {
    return buffer.toString("latin1");
  }
  return text;
}
```

## Prerequisites

- [ ] Sprint 029 (email attachments fundament) moet afgerond zijn

## Taken

- [ ] `packages/ai/src/pipeline/extractors/plaintext-extractor.ts` aanmaken met handlers per type
- [ ] TXT handler: buffer → UTF-8 string
- [ ] Markdown handler: buffer → UTF-8 string (behoud formatting)
- [ ] CSV handler: parse → leesbare tabelrepresentatie (max 50 rijen)
- [ ] HTML handler: intelligent tag stripping met structuurbehoud
- [ ] Encoding detectie utility: BOM check + fallback heuristiek
- [ ] Truncatie logica: max 50.000 karakters met indicatie
- [ ] Registreer alle handlers in de `extractTextFromAttachment()` dispatcher uit sprint 029
- [ ] Testen met diverse bestanden: UTF-8, Windows-1252, grote CSV, HTML met scripts

## Acceptatiecriteria

- [ ] [TXT-001] Plain text bestanden worden correct verwerkt
- [ ] [TXT-002] Markdown structuur blijft behouden in extracted_text
- [ ] [TXT-003] CSV wordt geconverteerd naar leesbare tabelrepresentatie
- [ ] [TXT-004] HTML wordt intelligent gestript met structuurbehoud
- [ ] [TXT-005] Niet-UTF-8 bestanden worden correct gedetecteerd en gedecodeerd
- [ ] [TXT-006] Bestanden > 50.000 karakters worden correct afgekapt
- [ ] [TXT-007] Geëxtraheerde tekst staat in `email_attachments.extracted_text`
- [ ] [TXT-008] Processing status lifecycle werkt correct
- [ ] [TXT-009] Embedding wordt gegenereerd voor extracted_text

## Geraakt door deze sprint

- `packages/ai/src/pipeline/extractors/plaintext-extractor.ts` (nieuw)
- `packages/ai/src/pipeline/attachment-processor.ts` (gewijzigd — TXT/MD/CSV/HTML handlers registreren)
