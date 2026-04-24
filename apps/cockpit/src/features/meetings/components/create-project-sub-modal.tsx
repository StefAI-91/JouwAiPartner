"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Modal } from "@/components/shared/modal";
import { createProjectAction } from "@/features/projects/actions/projects";

interface CreateProjectSubModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: { id: string; name: string }) => void;
  organizations: { id: string; name: string }[];
}

export function CreateProjectSubModal({
  open,
  onClose,
  onCreated,
  organizations,
}: CreateProjectSubModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Nieuw project aanmaken">
      {open && (
        <CreateProjectForm onClose={onClose} onCreated={onCreated} organizations={organizations} />
      )}
    </Modal>
  );
}

function CreateProjectForm({
  onClose,
  onCreated,
  organizations,
}: {
  onClose: () => void;
  onCreated: (project: { id: string; name: string }) => void;
  organizations: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Naam is verplicht");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createProjectAction({
        name: trimmed,
        organizationId: organizationId || null,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onCreated(result.data);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="sub-project-name" className="mb-1 block text-sm font-medium">
          Naam
        </label>
        <input
          ref={inputRef}
          id="sub-project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Bijv. Website Redesign"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <div>
        <label htmlFor="sub-project-org" className="mb-1 block text-sm font-medium">
          Organisatie (optioneel)
        </label>
        <select
          id="sub-project-org"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          disabled={isPending}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        >
          <option value="">Geen organisatie</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          Annuleren
        </Button>
        <Button type="submit" disabled={isPending}>
          Aanmaken
        </Button>
      </div>
    </form>
  );
}
