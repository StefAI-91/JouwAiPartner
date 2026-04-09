"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Users, X, Plus } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Modal } from "@/components/shared/modal";
import {
  linkMeetingParticipantAction,
  unlinkMeetingParticipantAction,
  createPersonAction,
} from "@/actions/meetings";

interface Person {
  id: string;
  name: string;
  role: string | null;
  organization: { name: string } | null;
}

interface Organization {
  id: string;
  name: string;
}

export function PeopleSelector({
  meetingId,
  linkedPeople,
  allPeople,
  organizations,
}: {
  meetingId: string;
  linkedPeople: { id: string; name: string }[];
  allPeople: Person[];
  organizations: Organization[];
}) {
  const [adding, setAdding] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linkedPeople.map((p) => p.id));
  const availablePeople = allPeople.filter((p) => !linkedIds.has(p.id));

  function handleAdd(personId: string) {
    if (personId === "__new__") {
      setShowCreate(true);
      return;
    }
    if (!personId) return;
    setError(null);

    startTransition(async () => {
      const result = await linkMeetingParticipantAction({ meetingId, personId });
      if ("error" in result) {
        setError(result.error);
      } else {
        setAdding(false);
      }
    });
  }

  function handleRemove(personId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkMeetingParticipantAction({ meetingId, personId });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  function handleCreated(newPerson: { id: string; name: string }) {
    setShowCreate(false);
    setError(null);
    startTransition(async () => {
      const result = await linkMeetingParticipantAction({ meetingId, personId: newPerson.id });
      if ("error" in result) {
        setError(result.error);
      } else {
        setAdding(false);
      }
    });
  }

  function personLabel(person: Person): string {
    const details = [person.role, person.organization?.name].filter(Boolean);
    return details.length > 0 ? `${person.name} (${details.join(", ")})` : person.name;
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Deelnemers
          </span>
        </div>

        {linkedPeople.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {linkedPeople.map((person) => (
              <span
                key={person.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                {person.name}
                <button
                  onClick={() => handleRemove(person.id)}
                  disabled={isPending}
                  className="rounded-full p-0.5 hover:bg-background/80"
                  aria-label={`${person.name} verwijderen`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {linkedPeople.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground">Geen deelnemers</p>
        )}

        {adding ? (
          <div className="flex items-center gap-2">
            <select
              key={linkedPeople.length}
              onChange={(e) => handleAdd(e.target.value)}
              disabled={isPending}
              defaultValue=""
              className="h-7 max-w-xs rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            >
              <option value="" disabled>
                Kies een persoon...
              </option>
              {availablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {personLabel(person)}
                </option>
              ))}
              <option value="__new__">+ Nieuw persoon toevoegen</option>
            </select>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setError(null);
                setAdding(false);
              }}
              disabled={isPending}
              aria-label="Annuleren"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setAdding(true)}
            className="text-muted-foreground"
          >
            <Plus className="size-3" data-icon="inline-start" />
            Deelnemer toevoegen
          </Button>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <CreatePersonModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
        organizations={organizations}
      />
    </>
  );
}

function CreatePersonModal({
  open,
  onClose,
  onCreated,
  organizations,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (person: { id: string; name: string }) => void;
  organizations: Organization[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setRole("");
      setOrganizationId("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

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
    <Modal open={open} onClose={onClose} title="Nieuw persoon toevoegen">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="person-name" className="mb-1 block text-sm font-medium">
            Naam
          </label>
          <input
            ref={inputRef}
            id="person-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isPending}
            placeholder="Bijv. Jan de Vries"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div>
          <label htmlFor="person-email" className="mb-1 block text-sm font-medium">
            E-mail (optioneel)
          </label>
          <input
            id="person-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            placeholder="jan@voorbeeld.nl"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div>
          <label htmlFor="person-role" className="mb-1 block text-sm font-medium">
            Rol (optioneel)
          </label>
          <input
            id="person-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isPending}
            placeholder="Bijv. CTO, Developer, PM"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div>
          <label htmlFor="person-org" className="mb-1 block text-sm font-medium">
            Organisatie (optioneel)
          </label>
          <select
            id="person-org"
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
    </Modal>
  );
}
