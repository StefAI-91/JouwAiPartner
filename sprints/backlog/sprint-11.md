# Sprint 11: Google Drive Ingestion Pipeline

**Phase:** V2 — Toegang & Kwaliteit
**Requirements:** REQ-302, REQ-303, REQ-304, REQ-305
**Depends on:** Sprint 10 (Drive webhook receiving notifications)
**Produces:** Google Docs content chunked, scored, and stored in the knowledge base

---

## Task 1: Fetch changed docs on notification

**What:** When Drive push notification arrives, call `changes.list` to get changed files, then fetch Google Doc content.

**Add to `supabase/functions/drive-webhook/index.ts`:**

```typescript
// After receiving a change notification:

// Retrieve stored page token
const { data: config } = await supabase
  .from("system_config")
  .select("value")
  .eq("key", "drive_page_token")
  .single();

let pageToken = config?.value;

// Fetch changes
const changesRes = await fetch(
  `https://www.googleapis.com/drive/v3/changes?pageToken=${pageToken}&fields=nextPageToken,newStartPageToken,changes(fileId,file(id,name,mimeType,modifiedTime,trashed))`,
  { headers: { Authorization: `Bearer ${accessToken}` } },
);

const changes = await changesRes.json();

// Update page token for next time
if (changes.newStartPageToken) {
  await supabase.from("system_config").upsert({
    key: "drive_page_token",
    value: changes.newStartPageToken,
  });
}

// Process each changed Google Doc
for (const change of changes.changes || []) {
  const file = change.file;
  if (!file || file.trashed) continue;
  if (file.mimeType !== "application/vnd.google-apps.document") continue;

  // Fetch doc content as plain text
  const contentRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const content = await contentRes.text();

  await processGoogleDoc(file, content);
}
```

**System config table** (create in Supabase if not exists):

```sql
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Task 2: Chunk documents by headings with overlap

**What:** Split long docs into ~400-token chunks at heading boundaries with 50-token overlap.

```typescript
interface DocChunk {
  text: string;
  section: string; // heading or "Introduction"
  chunkIndex: number;
  tokenEstimate: number;
}

const TARGET_TOKENS = 400;
const MAX_TOKENS = 500;
const OVERLAP_TOKENS = 50;
const CHARS_PER_TOKEN = 4;

function chunkDocument(content: string, title: string): DocChunk[] {
  // Split by headings (lines that look like headers)
  const sections = content.split(/\n(?=[A-Z#].*\n)/);
  const chunks: DocChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const lines = section.trim().split("\n");
    const sectionTitle = lines[0] || title;
    const sectionBody = lines.slice(1).join("\n").trim();

    if (!sectionBody) continue;

    const sectionTokens = Math.ceil(sectionBody.length / CHARS_PER_TOKEN);

    if (sectionTokens <= MAX_TOKENS) {
      // Section fits in one chunk
      chunks.push({
        text: `${sectionTitle}\n\n${sectionBody}`,
        section: sectionTitle,
        chunkIndex: chunkIndex++,
        tokenEstimate: sectionTokens,
      });
    } else {
      // Split section into smaller chunks with overlap
      const words = sectionBody.split(/\s+/);
      let start = 0;

      while (start < words.length) {
        const chunkWords = words.slice(start, start + TARGET_TOKENS);
        const chunkText = chunkWords.join(" ");

        chunks.push({
          text: `${sectionTitle}\n\n${chunkText}`,
          section: sectionTitle,
          chunkIndex: chunkIndex++,
          tokenEstimate: Math.ceil(chunkText.length / CHARS_PER_TOKEN),
        });

        // Move forward, but overlap by OVERLAP_TOKENS words
        start += TARGET_TOKENS - OVERLAP_TOKENS;
      }
    }
  }

  return chunks;
}
```

---

## Task 3: Handle doc updates (re-chunk, don't duplicate)

**What:** When a doc is updated, delete old chunks and re-insert. Pass through Gatekeeper.

```typescript
async function processGoogleDoc(
  file: { id: string; name: string; modifiedTime: string },
  content: string,
): Promise<void> {
  // Pre-filter: skip empty docs and templates
  if (!content.trim() || content.length < 50) return;
  if (file.name.toLowerCase().includes("template")) return;
  if (file.name.toLowerCase().startsWith("copy of")) return;

  const chunks = chunkDocument(content, file.name);

  // Check if doc already exists — if so, delete old chunks
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("source", `gdrive:${file.id}`)
    .limit(1);

  if (existing && existing.length > 0) {
    // Delete old chunks for this doc
    await supabase.from("documents").delete().eq("source", `gdrive:${file.id}`);
  }

  // Process each chunk through the Gatekeeper pipeline
  for (const chunk of chunks) {
    await processContent({
      table: "documents",
      data: {
        source: `gdrive:${file.id}`,
        title: `${file.name} — ${chunk.section}`,
        content: chunk.text,
        metadata: {
          google_file_id: file.id,
          section: chunk.section,
          chunk_index: chunk.chunkIndex,
          total_chunks: chunks.length,
          modified_at: file.modifiedTime,
        },
      },
      contentField: "content",
      metadata: {
        source: "document",
        title: file.name,
      },
    });
  }
}
```

**Key design decisions:**

- `source` field uses `gdrive:{fileId}` format — makes it easy to find all chunks from the same doc
- On update: delete all old chunks, re-chunk, re-ingest through Gatekeeper
- Each chunk includes the section heading for context
- Pre-filter skips templates and copies

---

## Verification

- [ ] Drive change notification triggers doc content fetch
- [ ] Page token is stored and updated after each changes.list call
- [ ] Non-Google-Doc files are skipped (only processes `application/vnd.google-apps.document`)
- [ ] Documents are chunked at heading boundaries (~400 tokens per chunk)
- [ ] Empty docs and templates are pre-filtered out
- [ ] Updated docs: old chunks deleted, new chunks inserted (no duplicates)
- [ ] Each chunk passes through Gatekeeper pipeline (scored, categorized, extracted)
- [ ] Chunks appear in `documents` table with correct metadata (google_file_id, section, chunk_index)
