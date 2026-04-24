"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Modal } from "@/components/shared/modal";
import { createPersonAction } from "@/features/directory/actions/people";

interface CreatePersonSubModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (person: { id: string; name: string }) => void;
  organizations: { id: string; name: string }[];
}

export function CreatePersonSubModal({
  open,
  onClose,
  onCreated,
  organizations,
}: CreatePersonSubModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Nieuw persoon toevoegen">
      {open && (
        <CreatePersonForm onClose={onClose} onCreated={onCreated} organizations={organizations} />
      )}
    </Modal>
  );
}

function CreatePersonForm({
  onClose,
  onCreated,
  organizations,
}: {
  onClose: () => void;
  onCreated: (person: { id: string; name: string }) => void;
  organizations: { id: string; name: string }[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
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
      const result = await createPersonAction({
        name: trimmed,
        email: email.trim() || null,
        role: role.trim() || null,
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
        <label htmlFor="sub-person-name" className="mb-1 block text-sm font-medium">
          Naam
        </label>
        <input
          ref={inputRef}
          id="sub-person-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          placeholder="Bijv. Jan de Vries"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <div>
        <label htmlFor="sub-person-email" className="mb-1 block text-sm font-medium">
          E-mail (optioneel)
        </label>
        <input
          id="sub-person-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          placeholder="jan@voorbeeld.nl"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <div>
        <label htmlFor="sub-person-role" className="mb-1 block text-sm font-medium">
          Rol (optioneel)
        </label>
        <input
          id="sub-person-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isPending}
          placeholder="Bijv. CTO, Developer, PM"
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <div>
        <label htmlFor="sub-person-org" className="mb-1 block text-sm font-medium">
          Organisatie (optioneel)
        </label>
        <select
          id="sub-person-org"
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
          Toevoegen
        </Button>
      </div>
    </form>
  );
}
