"use client";

import { useState, useTransition } from "react";
import { Button } from "@repo/ui/button";
import { Modal } from "@/components/shared/modal";
import { updateMeetingMetadataAction } from "../actions";
import { MetadataTagSelector } from "./metadata-tag-selector";
import { MetadataSubModals } from "./metadata-sub-modals";
import { MEETING_TYPES } from "@repo/database/constants/meetings";
import type { PersonWithOrg } from "@repo/database/queries/people";

const PARTY_TYPES = [
  { value: "internal", label: "Intern" },
  { value: "client", label: "Klant" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Overig" },
] as const;

interface MeetingMetadata {
  id: string;
  title: string | null;
  meeting_type: string | null;
  party_type: string | null;
  organization_id: string | null;
}

interface EditMetadataModalProps {
  open: boolean;
  onClose: () => void;
  meeting: MeetingMetadata;
  linkedProjects: { id: string; name: string }[];
  linkedPeople: { id: string; name: string }[];
  allPeople: PersonWithOrg[];
  allProjects: { id: string; name: string }[];
  organizations: { id: string; name: string }[];
}

export function EditMetadataModal(props: EditMetadataModalProps) {
  const { open, onClose } = props;
  return (
    <Modal open={open} onClose={onClose} title="Metadata bewerken" className="max-w-lg">
      {open && <EditMetadataForm {...props} />}
    </Modal>
  );
}

/**
 * Form body — rendered only while the modal is open so it remounts each time
 * (fresh state from props, no reset effect).
 */
function EditMetadataForm({
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

  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreatePerson, setShowCreatePerson] = useState(false);

  const allOrganizations = [...initialOrganizations, ...newOrganizations];
  const allProjectsMerged = [...allProjects, ...newProjects];
  const allPeopleMerged = [
    ...allPeople,
    ...newPeople.map((p) => ({ ...p, role: null, organization: null })),
  ];

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
      <div className="space-y-4">
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

        <MetadataTagSelector
          label="Projecten"
          selected={selectedProjects}
          available={availableProjects}
          onAdd={handleAddProject}
          onRemove={(id) => setSelectedProjects((prev) => prev.filter((p) => p.id !== id))}
          disabled={isPending}
          addPlaceholder="Project toevoegen..."
          newOptionLabel="+ Nieuw project aanmaken"
        />

        <MetadataTagSelector
          label="Deelnemers"
          selected={selectedPeople}
          available={availablePeople}
          onAdd={handleAddPerson}
          onRemove={(id) => setSelectedPeople((prev) => prev.filter((p) => p.id !== id))}
          disabled={isPending}
          addPlaceholder="Deelnemer toevoegen..."
          newOptionLabel="+ Nieuw persoon toevoegen"
          formatOption={(person) => personLabel(person as PersonWithOrg)}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </div>

      <MetadataSubModals
        organizations={allOrganizations}
        showCreateOrg={showCreateOrg}
        showCreateProject={showCreateProject}
        showCreatePerson={showCreatePerson}
        onCloseOrg={() => setShowCreateOrg(false)}
        onCloseProject={() => setShowCreateProject(false)}
        onClosePerson={() => setShowCreatePerson(false)}
        onOrgCreated={(org) => {
          setNewOrganizations((prev) => [...prev, org]);
          setOrganizationId(org.id);
          setShowCreateOrg(false);
        }}
        onProjectCreated={(project) => {
          setNewProjects((prev) => [...prev, project]);
          setSelectedProjects((prev) => [...prev, project]);
          setShowCreateProject(false);
        }}
        onPersonCreated={(person) => {
          setNewPeople((prev) => [...prev, person]);
          setSelectedPeople((prev) => [...prev, person]);
          setShowCreatePerson(false);
        }}
      />
    </>
  );
}
