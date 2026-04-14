"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updatePersonAction, deletePersonAction } from "@/actions/people";

interface EditPersonProps {
  person: {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    team: string | null;
    organization_id: string | null;
  };
  organizations: { id: string; name: string }[];
}

export function EditPerson({ person, organizations }: EditPersonProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email ?? "");
  const [role, setRole] = useState(person.role ?? "");
  const [team, setTeam] = useState(person.team ?? "");
  const [orgId, setOrgId] = useState(person.organization_id ?? "");

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePersonAction({
        id: person.id,
        name: name.trim(),
        email: email.trim() || null,
        role: role.trim() || null,
        team: team.trim() || null,
        organization_id: orgId || null,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditOpen(false);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePersonAction({ id: person.id });
      if ("error" in result) {
        setError(result.error);
        setDeleteOpen(false);
      } else {
        router.push("/people");
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Bewerken"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Verwijderen"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Persoon bewerken">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium">Naam</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Optioneel"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Rol</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Optioneel"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Team</label>
              <input
                type="text"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Optioneel"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Organisatie</label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Geen organisatie</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Persoon verwijderen"
        description={`Weet je zeker dat je "${person.name}" wilt verwijderen? Dit verwijdert de persoon uit alle meetingdeelnemers.`}
        loading={isPending}
      />
    </>
  );
}
