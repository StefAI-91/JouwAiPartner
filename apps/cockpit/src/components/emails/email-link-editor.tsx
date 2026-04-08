"use client";

import { useState, useTransition } from "react";
import { Building2, FolderKanban, X, Plus, Tag, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  linkEmailProjectAction,
  unlinkEmailProjectAction,
  updateEmailOrganizationAction,
  updateEmailSenderPersonAction,
  updateEmailTypeAction,
  updateEmailPartyTypeAction,
} from "@/actions/email-links";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  project_communication: "Projectcommunicatie",
  sales: "Sales",
  internal: "Intern",
  administrative: "Administratief",
  legal_finance: "Juridisch / Financieel",
  newsletter: "Nieuwsbrief",
  notification: "Notificatie",
  other: "Overig",
};

const PARTY_TYPE_LABELS: Record<string, string> = {
  internal: "Intern",
  client: "Klant",
  accountant: "Boekhouder",
  tax_advisor: "Fiscalist",
  lawyer: "Advocaat",
  partner: "Partner",
  other: "Overig",
};

interface EmailLinkEditorProps {
  emailId: string;
  currentOrganization: { id: string; name: string } | null;
  linkedProjects: { id: string; name: string }[];
  allOrganizations: { id: string; name: string }[];
  allProjects: { id: string; name: string }[];
  emailType: string | null;
  partyType: string | null;
  senderPerson: { id: string; name: string; role: string | null } | null;
  allPeople: { id: string; name: string; role: string | null }[];
}

export function EmailLinkEditor({
  emailId,
  currentOrganization,
  linkedProjects,
  allOrganizations,
  allProjects,
  emailType,
  partyType,
  senderPerson,
  allPeople,
}: EmailLinkEditorProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Koppelingen
      </h2>
      <div className="space-y-5">
        <OrganizationSelector
          emailId={emailId}
          currentOrganization={currentOrganization}
          allOrganizations={allOrganizations}
        />
        <ProjectLinker
          emailId={emailId}
          linkedProjects={linkedProjects}
          allProjects={allProjects}
        />
        <SenderPersonSelector
          emailId={emailId}
          currentPerson={senderPerson}
          allPeople={allPeople}
        />
        <EmailTypeSelector emailId={emailId} currentType={emailType} />
        <PartyTypeSelector emailId={emailId} currentType={partyType} />
      </div>
    </div>
  );
}

function OrganizationSelector({
  emailId,
  currentOrganization,
  allOrganizations,
}: {
  emailId: string;
  currentOrganization: { id: string; name: string } | null;
  allOrganizations: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(organizationId: string) {
    setError(null);
    const orgId = organizationId === "" ? null : organizationId;

    startTransition(async () => {
      const result = await updateEmailOrganizationAction({
        emailId,
        organizationId: orgId,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Building2 className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Organisatie
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentOrganization ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {currentOrganization.name}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Geen organisatie gekoppeld</span>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            {currentOrganization ? "Wijzig" : "Koppelen"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            defaultValue={currentOrganization?.id ?? ""}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen organisatie</option>
            {allOrganizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            disabled={isPending}
            aria-label="Annuleren"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ProjectLinker({
  emailId,
  linkedProjects,
  allProjects,
}: {
  emailId: string;
  linkedProjects: { id: string; name: string }[];
  allProjects: { id: string; name: string }[];
}) {
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const linkedIds = new Set(linkedProjects.map((p) => p.id));
  const availableProjects = allProjects.filter((p) => !linkedIds.has(p.id));

  function handleAdd(projectId: string) {
    if (!projectId) return;
    setError(null);

    startTransition(async () => {
      const result = await linkEmailProjectAction({ emailId, projectId });
      if ("error" in result) {
        setError(result.error);
      } else {
        setAdding(false);
      }
    });
  }

  function handleRemove(projectId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkEmailProjectAction({ emailId, projectId });
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <FolderKanban className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Projecten
        </span>
      </div>

      {linkedProjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linkedProjects.map((project) => (
            <span
              key={project.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
            >
              {project.name}
              <button
                onClick={() => handleRemove(project.id)}
                disabled={isPending}
                className="rounded-full p-0.5 hover:bg-background/80"
                aria-label={`${project.name} ontkoppelen`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {linkedProjects.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">Geen projecten gekoppeld</p>
      )}

      {adding ? (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleAdd(e.target.value)}
            disabled={isPending}
            defaultValue=""
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="" disabled>
              Kies een project...
            </option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
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
          Project koppelen
        </Button>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SenderPersonSelector({
  emailId,
  currentPerson,
  allPeople,
}: {
  emailId: string;
  currentPerson: { id: string; name: string; role: string | null } | null;
  allPeople: { id: string; name: string; role: string | null }[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(personId: string) {
    setError(null);
    const id = personId === "" ? null : personId;

    startTransition(async () => {
      const result = await updateEmailSenderPersonAction({
        emailId,
        senderPersonId: id,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <UserCircle className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Afzender (persoon)
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentPerson ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {currentPerson.name}
              {currentPerson.role && (
                <span className="text-muted-foreground">({currentPerson.role})</span>
              )}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Geen persoon gekoppeld</span>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            {currentPerson ? "Wijzig" : "Koppelen"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            defaultValue={currentPerson?.id ?? ""}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen persoon</option>
            {allPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
                {person.role ? ` (${person.role})` : ""}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            disabled={isPending}
            aria-label="Annuleren"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function EmailTypeSelector({
  emailId,
  currentType,
}: {
  emailId: string;
  currentType: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: string) {
    setError(null);
    const emailType = value === "" ? null : value;

    startTransition(async () => {
      const result = await updateEmailTypeAction({
        emailId,
        emailType: emailType as Parameters<typeof updateEmailTypeAction>[0]["emailType"],
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Tag className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Email type
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentType ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {EMAIL_TYPE_LABELS[currentType] ?? currentType}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Niet ingesteld</span>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            {currentType ? "Wijzig" : "Instellen"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            defaultValue={currentType ?? ""}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen type</option>
            {Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            disabled={isPending}
            aria-label="Annuleren"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PartyTypeSelector({
  emailId,
  currentType,
}: {
  emailId: string;
  currentType: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(value: string) {
    setError(null);
    const partyType = value === "" ? null : value;

    startTransition(async () => {
      const result = await updateEmailPartyTypeAction({
        emailId,
        partyType: partyType as Parameters<typeof updateEmailPartyTypeAction>[0]["partyType"],
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <UserCircle className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Persoon type
        </span>
      </div>

      {!editing ? (
        <div className="flex items-center gap-2">
          {currentType ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {PARTY_TYPE_LABELS[currentType] ?? currentType}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Niet ingesteld</span>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="text-muted-foreground"
          >
            {currentType ? "Wijzig" : "Instellen"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => handleChange(e.target.value)}
            disabled={isPending}
            defaultValue={currentType ?? ""}
            className="h-7 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
          >
            <option value="">Geen type</option>
            {Object.entries(PARTY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setError(null);
              setEditing(false);
            }}
            disabled={isPending}
            aria-label="Annuleren"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
