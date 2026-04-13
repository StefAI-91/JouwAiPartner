"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Modal } from "@/components/shared/modal";
import { updateMeetingMetadataAction } from "@/actions/meetings";
import {
  createOrganizationAction,
  createProjectAction,
  createPersonAction,
} from "@/actions/entities";
import { MEETING_TYPES } from "@repo/database/constants/meetings";
import type { PersonWithOrg } from "@repo/database/queries/people";

const PARTY_TYPES = [
  { value: "internal", label: "Intern" },
  { value: "client", label: "Klant" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Overig" },
] as const;

interface EditMetadataModalProps {
  open: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    title: string | null;
    meeting_type: string | null;
    party_type: string | null;
    organization_id: string | null;
  };
  linkedProjects: { id: string; name: string }[];
  linkedPeople: { id: string; name: string }[];
  allPeople: PersonWithOrg[];
  allProjects: { id: string; name: string }[];
  organizations: { id: string; name: string }[];
}

export function EditMetadataModal({
  open,
  onClose,
  meeting,
  linkedProjects,
  linkedPeople,
  allPeople,
  allProjects,
  organizations: initialOrganizations,
}: EditMetadataModalProps) {
  const [title, setTitle] = useState(meeting.title ?? "");
  const [meetingType, setMeetingType] = useState(meeting.meeting_type ?? "other");
  const [partyType, setPartyType] = useState(meeting.party_type ?? "other");
  const [organizationId, setOrganizationId] = useState<string | null>(meeting.organization_id);
  const [selectedProjects, setSelectedProjects] =
    useState<{ id: string; name: string }[]>(linkedProjects);
  const [selectedPeople, setSelectedPeople] =
    useState<{ id: string; name: string }[]>(linkedPeople);

  // Track newly created entities (not yet in props)
  const [newOrganizations, setNewOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [newProjects, setNewProjects] = useState<{ id: string; name: string }[]>([]);
  const [newPeople, setNewPeople] = useState<{ id: string; name: string }[]>([]);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sub-modal states
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreatePerson, setShowCreatePerson] = useState(false);

  const allOrganizations = [...initialOrganizations, ...newOrganizations];
  const allProjectsMerged = [...allProjects, ...newProjects];
  const allPeopleMerged = [
    ...allPeople,
    ...newPeople.map((p) => ({ ...p, role: null, organization: null })),
  ];

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setTitle(meeting.title ?? "");
      setMeetingType(meeting.meeting_type ?? "other");
      setPartyType(meeting.party_type ?? "other");
      setOrganizationId(meeting.organization_id);
      setSelectedProjects(linkedProjects);
      setSelectedPeople(linkedPeople);
      setNewOrganizations([]);
      setNewProjects([]);
      setNewPeople([]);
      setError(null);
    }
  }, [open, meeting, linkedProjects, linkedPeople]);

  // Computed available options (exclude already selected)
  const selectedProjectIds = new Set(selectedProjects.map((p) => p.id));
  const availableProjects = allProjectsMerged.filter((p) => !selectedProjectIds.has(p.id));

  const selectedPeopleIds = new Set(selectedPeople.map((p) => p.id));
  const availablePeople = allPeopleMerged.filter((p) => !selectedPeopleIds.has(p.id));

  function handleAddProject(value: string) {
    if (value === "__new__") {
      setShowCreateProject(true);
      return;
    }
    if (!value) return;
    const project = allProjectsMerged.find((p) => p.id === value);
    if (project) {
      setSelectedProjects((prev) => [...prev, { id: project.id, name: project.name }]);
    }
  }

  function handleAddPerson(value: string) {
    if (value === "__new__") {
      setShowCreatePerson(true);
      return;
    }
    if (!value) return;
    const person = allPeopleMerged.find((p) => p.id === value);
    if (person) {
      setSelectedPeople((prev) => [...prev, { id: person.id, name: person.name }]);
    }
  }

  function handleOrganizationChange(value: string) {
    if (value === "__new__") {
      setShowCreateOrg(true);
      return;
    }
    setOrganizationId(value || null);
  }

  function personLabel(person: PersonWithOrg): string {
    const details = [person.role, person.organization?.name].filter(Boolean);
    return details.length > 0 ? `${person.name} (${details.join(", ")})` : person.name;
  }

  function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Titel is verplicht");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await updateMeetingMetadataAction({
        meetingId: meeting.id,
        title: trimmed,
        meetingType: meetingType as (typeof MEETING_TYPES)[number]["value"],
        partyType: partyType as (typeof PARTY_TYPES)[number]["value"],
        organizationId,
        projectIds: selectedProjects.map((p) => p.id),
        participantIds: selectedPeople.map((p) => p.id),
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Metadata bewerken" className="max-w-lg">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="meta-title" className="mb-1 block text-sm font-medium">
              Titel
            </label>
            <input
              id="meta-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            />
          </div>

          {/* Meeting Type + Party Type in a row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="meta-meeting-type" className="mb-1 block text-sm font-medium">
                Meeting type
              </label>
              <select
                id="meta-meeting-type"
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                {MEETING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="meta-party-type" className="mb-1 block text-sm font-medium">
                Party type
              </label>
              <select
                id="meta-party-type"
                value={partyType}
                onChange={(e) => setPartyType(e.target.value)}
                disabled={isPending}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                {PARTY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Organization */}
          <div>
            <label htmlFor="meta-organization" className="mb-1 block text-sm font-medium">
              Organisatie
            </label>
            <select
              id="meta-organization"
              value={organizationId ?? ""}
              onChange={(e) => handleOrganizationChange(e.target.value)}
              disabled={isPending}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            >
              <option value="">Geen organisatie</option>
              {allOrganizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
              <option value="__new__">+ Nieuwe organisatie</option>
            </select>
          </div>

          {/* Projects */}
          <div>
            <label className="mb-1 block text-sm font-medium">Projecten</label>
            {selectedProjects.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedProjects.map((project) => (
                  <span
                    key={project.id}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                  >
                    {project.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProjects((prev) => prev.filter((p) => p.id !== project.id))
                      }
                      disabled={isPending}
                      className="rounded-full p-0.5 hover:bg-background/80"
                      aria-label={`${project.name} verwijderen`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <select
              key={selectedProjects.length}
              onChange={(e) => {
                handleAddProject(e.target.value);
                e.target.value = "";
              }}
              disabled={isPending}
              defaultValue=""
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            >
              <option value="" disabled>
                Project toevoegen...
              </option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
              <option value="__new__">+ Nieuw project aanmaken</option>
            </select>
          </div>

          {/* Participants */}
          <div>
            <label className="mb-1 block text-sm font-medium">Deelnemers</label>
            {selectedPeople.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {selectedPeople.map((person) => (
                  <span
                    key={person.id}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                  >
                    {person.name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPeople((prev) => prev.filter((p) => p.id !== person.id))
                      }
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
            <select
              key={selectedPeople.length}
              onChange={(e) => {
                handleAddPerson(e.target.value);
                e.target.value = "";
              }}
              disabled={isPending}
              defaultValue=""
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
            >
              <option value="" disabled>
                Deelnemer toevoegen...
              </option>
              {availablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {personLabel(person)}
                </option>
              ))}
              <option value="__new__">+ Nieuw persoon toevoegen</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Sub-modals for creating new entities */}
      <CreateOrganizationModal
        open={showCreateOrg}
        onClose={() => setShowCreateOrg(false)}
        onCreated={(org) => {
          setNewOrganizations((prev) => [...prev, org]);
          setOrganizationId(org.id);
          setShowCreateOrg(false);
        }}
      />
      <CreateProjectSubModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={(project) => {
          setNewProjects((prev) => [...prev, project]);
          setSelectedProjects((prev) => [...prev, project]);
          setShowCreateProject(false);
        }}
        organizations={allOrganizations}
      />
      <CreatePersonSubModal
        open={showCreatePerson}
        onClose={() => setShowCreatePerson(false)}
        onCreated={(person) => {
          setNewPeople((prev) => [...prev, person]);
          setSelectedPeople((prev) => [...prev, person]);
          setShowCreatePerson(false);
        }}
        organizations={allOrganizations}
      />
    </>
  );
}

// ── Sub-modal: Create Organization ──

function CreateOrganizationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (org: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("client");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setType("client");
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
    <Modal open={open} onClose={onClose} title="Nieuwe organisatie">
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
    </Modal>
  );
}

// ── Sub-modal: Create Project ──

function CreateProjectSubModal({
  open,
  onClose,
  onCreated,
  organizations,
}: {
  open: boolean;
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
    if (open) {
      setName("");
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
    <Modal open={open} onClose={onClose} title="Nieuw project aanmaken">
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
    </Modal>
  );
}

// ── Sub-modal: Create Person ──

function CreatePersonSubModal({
  open,
  onClose,
  onCreated,
  organizations,
}: {
  open: boolean;
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
    </Modal>
  );
}
