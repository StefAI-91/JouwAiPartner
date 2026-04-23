"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@repo/database/supabase/client";
import { createIssueAction } from "@/actions/issues";
import { recordIssueAttachmentAction } from "@/actions/attachments";
import { Button } from "@repo/ui/button";
import {
  ISSUE_TYPES,
  ISSUE_TYPE_LABELS,
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABELS,
  ISSUE_COMPONENTS,
  ISSUE_COMPONENT_LABELS,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
} from "@repo/database/constants/issues";
import { FormSelect } from "./sidebar-fields";
import { LabelInput } from "./label-input";
import { ImageUpload, type PendingImage } from "./image-upload";

const ATTACHMENT_BUCKET = "issue-attachments";

/**
 * Sanitize a filename for use in a storage path — strip anything that isn't
 * a safe URL/path character. Keeps a readable shape but avoids spaces,
 * accents, and separators that Supabase storage dislikes.
 */
function sanitizeFileName(name: string): string {
  const trimmed = name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return trimmed.length > 120 ? trimmed.slice(0, 120) : trimmed || "image";
}

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

export function IssueForm({
  projectId,
  people,
}: {
  projectId: string | null;
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("bug");
  const [priority, setPriority] = useState("medium");
  const [component, setComponent] = useState("");
  const [severity, setSeverity] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function uploadImages(issueId: string) {
    if (images.length === 0) return;
    const supabase = createClient();

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      setUploadStatus(`Afbeelding ${i + 1}/${images.length} uploaden…`);

      const extFromType = img.file.type.split("/")[1] ?? "bin";
      const safeName = sanitizeFileName(img.file.name || `image.${extFromType}`);
      const storagePath = `issues/${issueId}/${Date.now()}-${i}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .upload(storagePath, img.file, {
          contentType: img.file.type,
          upsert: false,
        });
      if (uploadErr) {
        throw new Error(`Upload mislukt (${img.file.name}): ${uploadErr.message}`);
      }

      const recordResult = await recordIssueAttachmentAction({
        issue_id: issueId,
        type: "screenshot",
        storage_path: storagePath,
        file_name: safeName,
        mime_type: img.file.type || null,
        file_size: img.file.size,
        width: img.width ?? null,
        height: img.height ?? null,
      });
      if ("error" in recordResult) {
        // Record-insert failed after the blob landed in storage — delete the
        // orphan so the bucket doesn't accumulate untracked files. Ignore the
        // delete's own failure: logging is enough, the UI surfaces the
        // original error regardless.
        await supabase.storage
          .from(ATTACHMENT_BUCKET)
          .remove([storagePath])
          .catch((e) => console.error("[issue-form] rollback remove failed:", e));
        throw new Error(`Bijlage registreren mislukt: ${recordResult.error}`);
      }
    }
    setUploadStatus(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return setError("Selecteer eerst een project");
    setError(null);
    startTransition(async () => {
      const result = await createIssueAction({
        project_id: projectId,
        title,
        description: description || null,
        type: type as "bug",
        priority: priority as "medium",
        component: (component || null) as "frontend" | null,
        severity: (severity || null) as "critical" | null,
        assigned_to: assignedTo || null,
        labels,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      try {
        await uploadImages(result.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload mislukt");
        setUploadStatus(null);
        // Issue exists — still navigate so the user can retry uploads on the
        // detail page rather than losing everything they just typed.
        router.push(`/issues/${result.id}?project=${projectId}`);
        return;
      }
      router.push(`/issues/${result.id}?project=${projectId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 p-6">
      <h1>Nieuw issue</h1>
      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-medium">
          Titel <span className="text-destructive">*</span>
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Korte beschrijving van het issue"
          required
          maxLength={500}
          className={INPUT_CLASS}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Beschrijving
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Gedetailleerde beschrijving, stappen om te reproduceren, verwacht gedrag..."
          rows={6}
          maxLength={10000}
          className={`${INPUT_CLASS} resize-y`}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          id="type"
          label="Type"
          value={type}
          onChange={setType}
          options={ISSUE_TYPES.map((t) => ({ value: t, label: ISSUE_TYPE_LABELS[t] }))}
        />
        <FormSelect
          id="priority"
          label="Prioriteit"
          value={priority}
          onChange={setPriority}
          options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: ISSUE_PRIORITY_LABELS[p] }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormSelect
          id="component"
          label="Component"
          value={component}
          onChange={setComponent}
          options={ISSUE_COMPONENTS.map((c) => ({ value: c, label: ISSUE_COMPONENT_LABELS[c] }))}
          placeholder="-- Geen --"
        />
        <FormSelect
          id="severity"
          label="Ernst"
          value={severity}
          onChange={setSeverity}
          options={ISSUE_SEVERITIES.map((s) => ({ value: s, label: ISSUE_SEVERITY_LABELS[s] }))}
          placeholder="-- Geen --"
        />
      </div>
      <FormSelect
        id="assigned_to"
        label="Toewijzen aan"
        value={assignedTo}
        onChange={setAssignedTo}
        options={people.map((p) => ({ value: p.id, label: p.name }))}
        placeholder="-- Niet toegewezen --"
      />
      <LabelInput
        labels={labels}
        onAdd={(label) => setLabels((prev) => [...prev, label])}
        onRemove={(label) => setLabels((prev) => prev.filter((l) => l !== label))}
      />
      <ImageUpload images={images} onChange={setImages} disabled={isPending} />
      {uploadStatus && <p className="text-xs text-muted-foreground">{uploadStatus}</p>}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending || !projectId}>
          {isPending ? "Aanmaken..." : "Issue aanmaken"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
