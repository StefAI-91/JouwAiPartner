"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateOrganizationAction, deleteOrganizationAction } from "@/actions/entities";
import { ORG_TYPES, ORG_STATUSES } from "@repo/database/constants/organizations";

interface EditOrganizationProps {
  org: {
    id: string;
    name: string;
    type: string;
    status: string;
    contact_person: string | null;
    email: string | null;
  };
}

export function EditOrganization({ org }: EditOrganizationProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(org.name);
  const [type, setType] = useState(org.type);
  const [status, setStatus] = useState(org.status);
  const [contactPerson, setContactPerson] = useState(org.contact_person ?? "");
  const [email, setEmail] = useState(org.email ?? "");

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateOrganizationAction({
        id: org.id,
        name: name.trim(),
        type: type as (typeof ORG_TYPES)[number],
        status: status as (typeof ORG_STATUSES)[number],
        contact_person: contactPerson.trim() || null,
        email: email.trim() || null,
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
      const result = await deleteOrganizationAction({ id: org.id });
      if ("error" in result) {
        setError(result.error);
        setDeleteOpen(false);
      } else {
        router.push("/clients");
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

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Organisatie bewerken">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {ORG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {ORG_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Contactpersoon</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Optioneel"
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
        title="Organisatie verwijderen"
        description={`Weet je zeker dat je "${org.name}" wilt verwijderen? Dit ontkoppelt alle meetings en projecten van deze organisatie.`}
        loading={isPending}
      />
    </>
  );
}
