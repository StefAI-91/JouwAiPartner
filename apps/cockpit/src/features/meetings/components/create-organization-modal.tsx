"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Modal } from "@/components/shared/modal";
import { createOrganizationAction } from "@/features/directory/actions/organizations";

interface CreateOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (org: { id: string; name: string }) => void;
}

export function CreateOrganizationModal({
  open,
  onClose,
  onCreated,
}: CreateOrganizationModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Nieuwe organisatie">
      {open && <CreateOrganizationForm onClose={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

/**
 * Form body — rendered only while the modal is open, so it remounts each
 * time (fresh state, focus on mount) without needing a reset effect.
 */
function CreateOrganizationForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (org: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("client");
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
      const result = await createOrganizationAction({
        name: trimmed,
        type: type as "client" | "partner" | "supplier" | "other",
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
        <label htmlFor="org-name" className="mb-1 block text-sm font-medium">
          Naam
        </label>
        <input
          ref={inputRef}
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Bijv. Acme B.V."
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <div>
        <label htmlFor="org-type" className="mb-1 block text-sm font-medium">
          Type
        </label>
        <select
          id="org-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={isPending}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        >
          <option value="client">Klant</option>
          <option value="partner">Partner</option>
          <option value="supplier">Leverancier</option>
          <option value="other">Overig</option>
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
