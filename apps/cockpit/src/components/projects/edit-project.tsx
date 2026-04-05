"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { updateProjectAction, deleteProjectAction } from "@/actions/entities";

interface EditProjectProps {
  project: {
    id: string;
    name: string;
    status: string;
    description?: string | null;
    start_date?: string | null;
    deadline?: string | null;
    owner?: { id: string; name: string } | null;
    contact_person?: { id: string; name: string } | null;
  };
  organizationId: string | null;
  organizations: { id: string; name: string }[];
  people?: { id: string; name: string }[];
}

const PROJECT_STATUSES = [
  "lead",
  "discovery",
  "proposal",
  "negotiation",
  "won",
  "kickoff",
  "in_progress",
  "review",
  "completed",
  "on_hold",
  "lost",
  "maintenance",
  "active",
] as const;

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  kickoff: "Kickoff",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  on_hold: "On Hold",
  lost: "Lost",
  maintenance: "Maintenance",
  active: "Active",
};

export function EditProject({
  project,
  organizationId,
  organizations,
  people = [],
}: EditProjectProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState(project.status);
  const [orgId, setOrgId] = useState(organizationId ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [ownerId, setOwnerId] = useState(project.owner?.id ?? "");
  const [contactPersonId, setContactPersonId] = useState(project.contact_person?.id ?? "");
  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [deadline, setDeadline] = useState(project.deadline ?? "");

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateProjectAction({
        id: project.id,
        name: name.trim(),
        status: status as (typeof PROJECT_STATUSES)[number],
        organization_id: orgId || null,
        description: description.trim() || null,
        owner_id: ownerId || null,
        contact_person_id: contactPersonId || null,
        start_date: startDate || null,
        deadline: deadline || null,
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
      const result = await deleteProjectAction({ id: project.id });
      if ("error" in result) {
        setError(result.error);
        setDeleteOpen(false);
      } else {
        router.push("/projects");
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
          title="Edit project"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Delete project"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
              placeholder="Project beschrijving..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Organization</label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">No organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Owner</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">No owner</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Contact Person</label>
              <select
                value={contactPersonId}
                onChange={(e) => setContactPersonId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">No contact person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Deadline</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This will unlink all meetings and extractions from this project.`}
        loading={isPending}
      />
    </>
  );
}
