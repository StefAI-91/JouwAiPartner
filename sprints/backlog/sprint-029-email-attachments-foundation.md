# Sprint 029: Email Attachments — Fundament

## Doel

De basis leggen voor het verwerken van email bijlagen. Een `email_attachments` tabel voor metadata + geëxtraheerde tekst, een private Supabase Storage bucket voor de binaries, en een download pipeline die bijlagen ophaalt bij email sync. Dit is het fundament waarop de type-specifieke extractie-sprints (030-032) bouwen.

## Requirements

| ID         | Beschrijving                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| ATTACH-001 | `email_attachments` tabel met metadata, processing status, extracted text en storage path               |
| ATTACH-002 | Private Supabase Storage bucket `email-attachments` met RLS (alleen authenticated users)                |
| ATTACH-003 | Gmail attachment download via `gmail.users.messages.attachments.get`                                    |
| ATTACH-004 | Upload binary naar Supabase Storage onder `{email_id}/{filename}`                                       |
| ATTACH-005 | Limieten: max 10MB per bijlage, max 10 bijlagen per email                                               |
| ATTACH-006 | Ondersteunde mime types whitelist (pdf, docx, txt, md, csv, html) — rest wordt metadata-only opgeslagen |
| ATTACH-007 | Processing status lifecycle: pending → processing → processed / failed / skipped                        |
| ATTACH-008 | Attachment metadata wordt opgeslagen bij elke email sync (ook voor niet-ondersteunde types)             |
| ATTACH-009 | Queries en mutations voor email_attachments (CRUD, status updates, listing)                             |
| ATTACH-010 | Signed URL generatie voor beveiligde download vanuit dashboard                                          |
| ATTACH-011 | Embedding van extracted_text via Cohere embed-v4 (1024 dim)                                             |
| ATTACH-012 | Pipeline integratie: attachment tekst wordt samengevoegd met email body voor extractor agent            |

## Context

### Huidige situatie

- `emails` tabel heeft `has_attachments: boolean` — detecteert of bijlagen bestaan
- `gmail.ts` detecteert attachments via `payload.parts` maar downloadt ze niet
- `raw_gmail` bevat message metadata maar niet de attachment binaries (Gmail API levert die apart)
- Email pipeline (`email-pipeline.ts`) verwerkt alleen `body_text` + `snippet`

### Datamodel

```sql
CREATE TABLE email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    gmail_attachment_id TEXT,                    -- voor lazy re-download indien nodig
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER,
    content_hash TEXT,                           -- SHA-256 voor dedup
    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'skipped')),
    processing_error TEXT,                       -- foutmelding bij failed
    extracted_text TEXT,                         -- geëxtraheerde tekst (door sprint 030-032)
    storage_path TEXT,                           -- pad in Supabase Storage bucket
    embedding VECTOR(1024),
    embedding_stale BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX idx_email_attachments_status ON email_attachments(processing_status);
CREATE INDEX idx_email_attachments_mime ON email_attachments(mime_type);
```

### Storage bucket

```
Supabase Storage
└── bucket: "email-attachments" (private, niet public)
    └── {email_id}/{filename}
```

- Private bucket — alleen via signed URLs toegankelijk
- Signed URLs verlopen na 1 uur (configureerbaar)
- RLS: alleen authenticated users kunnen bestanden lezen

### Limieten

| Limiet                 | Waarde                        | Reden                                         |
| ---------------------- | ----------------------------- | --------------------------------------------- |
| Max bestandsgrootte    | 10 MB                         | Grotere bestanden zijn zelden tekst-relevant  |
| Max bijlagen per email | 10                            | Bescherming tegen bulk/spam                   |
| Ondersteunde types     | pdf, docx, txt, md, csv, html | Tekstrijke formaten met betrouwbare extractie |

### Mime type whitelist (voor processing)

```typescript
const PROCESSABLE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
];
```

Niet-ondersteunde types (afbeeldingen, video, zip, etc.) worden wel als metadata opgeslagen (`processing_status: 'skipped'`) maar niet gedownload/verwerkt.

### Gmail Attachment Download

De Gmail API levert attachment content apart via:

```
GET /gmail/v1/users/{userId}/messages/{messageId}/attachments/{attachmentId}
```

Response bevat `data` (base64url-encoded binary). Dit moet:

1. Gedecodeerd worden naar Buffer
2. Geüpload worden naar Supabase Storage
3. Content hash (SHA-256) berekend worden voor dedup

### Pipeline integratie

De `processEmail()` functie in `email-pipeline.ts` wordt uitgebreid:

```
Huidige flow:
  classify → resolve org → link projects → extract insights → embed

Nieuwe flow:
  classify → resolve org → link projects
    → download attachments → upload to storage
    → extract insights(body_text + attachment_texts)  ← samengevoegd
    → embed(body_text + attachment_texts)
```

De extractor krijgt een gecombineerde tekst:

```
Subject: Projectvoorstel Klant X
Body: Hierbij het voorstel, zie bijlage.
---
Bijlage [1]: voorstel-klant-x.pdf (3 pagina's)
[geëxtraheerde tekst uit PDF]
---
Bijlage [2]: planning.docx
[geëxtraheerde tekst uit DOCX]
```

**Let op:** De daadwerkelijke tekstextractie per type (PDF, DOCX, etc.) wordt gebouwd in sprint 030-032. Deze sprint bouwt het fundament + de `extractTextFromAttachment()` interface die die sprints invullen.

## Prerequisites

- [ ] Email routes en pipeline moeten werken (emails tabel, gmail.ts, email-pipeline.ts)

## Taken

- [ ] Database migratie: `email_attachments` tabel aanmaken met alle kolommen, indexes en RLS
- [ ] Supabase Storage bucket `email-attachments` aanmaken (private, RLS policy)
- [ ] `gmail.ts` uitbreiden: `downloadAttachment()` functie die binary ophaalt via Gmail API
- [ ] `packages/database/src/mutations/email-attachments.ts`: insertAttachmentMetadata, updateAttachmentStatus, updateExtractedText
- [ ] `packages/database/src/queries/email-attachments.ts`: listAttachmentsByEmail, getAttachmentById, getPendingAttachments, getSignedAttachmentUrl
- [ ] Storage helper: upload binary naar bucket, genereer signed URL voor download
- [ ] Attachment processing pipeline: download → hash → upload → status update (extracted_text vullen delegeert naar type-specifieke handlers)
- [ ] `extractTextFromAttachment()` interface/dispatcher die op basis van mime_type de juiste handler aanroept (stub handlers voor sprint 030-032)
- [ ] Email pipeline integratie: attachment tekst samenvoegen met body_text voor extractor + embedder
- [ ] Embedding: extracted_text embedden via Cohere na succesvolle extractie

## Acceptatiecriteria

- [ ] [ATTACH-001] `email_attachments` tabel bestaat met alle kolommen en correct schema
- [ ] [ATTACH-002] Private Storage bucket `email-attachments` is aangemaakt met RLS
- [ ] [ATTACH-003] Bijlagen worden gedownload via Gmail API bij email sync
- [ ] [ATTACH-004] Binaries worden correct geüpload naar Storage onder `{email_id}/{filename}`
- [ ] [ATTACH-005] Bijlagen > 10MB worden geskipt, max 10 per email
- [ ] [ATTACH-006] Alleen whitelisted mime types worden verwerkt, rest is metadata-only
- [ ] [ATTACH-007] Processing status lifecycle werkt correct (pending → processing → processed/failed/skipped)
- [ ] [ATTACH-008] Alle attachment metadata wordt opgeslagen, ook voor niet-ondersteunde types
- [ ] [ATTACH-009] Queries en mutations werken correct
- [ ] [ATTACH-010] Signed URLs worden gegenereerd voor beveiligde download
- [ ] [ATTACH-012] Extractor ontvangt gecombineerde tekst (body + attachment extracted_text)

## Geraakt door deze sprint

- `supabase/migrations/YYYYMMDD_email_attachments.sql` (nieuw)
- `packages/database/src/mutations/email-attachments.ts` (nieuw)
- `packages/database/src/queries/email-attachments.ts` (nieuw)
- `packages/ai/src/gmail.ts` (gewijzigd — downloadAttachment functie)
- `packages/ai/src/pipeline/email-pipeline.ts` (gewijzigd — attachment processing + tekst samenvoegen)
- `packages/ai/src/pipeline/attachment-processor.ts` (nieuw — dispatcher + storage helpers)
- `packages/database/src/types/database.ts` (gewijzigd — regenereer na migratie)
