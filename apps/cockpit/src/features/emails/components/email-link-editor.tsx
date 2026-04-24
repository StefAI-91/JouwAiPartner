"use client";

import { OrganizationSelector } from "./organization-selector";
import { ProjectLinker } from "./project-linker";
import { SenderPersonSelector } from "./sender-person-selector";
import { EmailTypeSelector } from "./email-type-selector";
import { PartyTypeSelector } from "./party-type-selector";

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
