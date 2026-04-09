import type { IssueAttachmentRow } from "@repo/database/queries/issues";
import { Image as ImageIcon, Video, Paperclip, ExternalLink } from "lucide-react";

function storageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/issue-attachments/${path}`;
}

function ScreenshotGrid({ attachments }: { attachments: IssueAttachmentRow[] }) {
  const screenshots = attachments.filter((a) => a.type === "screenshot");
  if (screenshots.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {screenshots.map((a) => {
        const publicUrl = storageUrl(a.storage_path);
        return (
          <a
            key={a.id}
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-md border border-border bg-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicUrl}
              alt={a.file_name}
              className="w-full object-contain"
              style={{ maxHeight: 400 }}
            />
            <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              <ImageIcon className="size-3" />
              <span className="truncate">{a.file_name}</span>
              {a.width && a.height && (
                <span className="ml-auto shrink-0">
                  {a.width}x{a.height}
                </span>
              )}
              <ExternalLink className="size-3 shrink-0 opacity-0 group-hover:opacity-100" />
            </div>
          </a>
        );
      })}
    </div>
  );
}

function VideoList({ attachments }: { attachments: IssueAttachmentRow[] }) {
  const videos = attachments.filter((a) => a.type === "video");
  if (videos.length === 0) return null;

  return (
    <>
      {videos.map((a) => {
        const publicUrl = storageUrl(a.storage_path);
        return (
          <div key={a.id} className="overflow-hidden rounded-md border border-border bg-card">
            <video src={publicUrl} controls className="w-full" style={{ maxHeight: 500 }} />
            <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              <Video className="size-3" />
              <span className="truncate">{a.file_name}</span>
              {a.file_size && (
                <span className="ml-auto">{(a.file_size / 1024 / 1024).toFixed(1)} MB</span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function FileList({ attachments }: { attachments: IssueAttachmentRow[] }) {
  const files = attachments.filter((a) => a.type === "attachment");
  if (files.length === 0) return null;

  return (
    <>
      {files.map((a) => {
        const publicUrl = storageUrl(a.storage_path);
        return (
          <a
            key={a.id}
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
          >
            <Paperclip className="size-4 text-muted-foreground" />
            <span className="truncate">{a.file_name}</span>
            {a.file_size && (
              <span className="ml-auto text-xs text-muted-foreground">
                {a.file_size > 1024 * 1024
                  ? `${(a.file_size / 1024 / 1024).toFixed(1)} MB`
                  : `${Math.round(a.file_size / 1024)} KB`}
              </span>
            )}
            <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
          </a>
        );
      })}
    </>
  );
}

export function IssueAttachments({ attachments }: { attachments: IssueAttachmentRow[] }) {
  if (attachments.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2">Bijlagen</h2>
      <div className="space-y-3">
        <ScreenshotGrid attachments={attachments} />
        <VideoList attachments={attachments} />
        <FileList attachments={attachments} />
      </div>
    </section>
  );
}
