"use client";

import { CreateOrganizationModal } from "./create-organization-modal";
import { CreateProjectSubModal } from "./create-project-sub-modal";
import { CreatePersonSubModal } from "./create-person-sub-modal";

interface SimpleEntity {
  id: string;
  name: string;
}

interface MetadataSubModalsProps {
  organizations: SimpleEntity[];
  showCreateOrg: boolean;
  showCreateProject: boolean;
  showCreatePerson: boolean;
  onCloseOrg: () => void;
  onCloseProject: () => void;
  onClosePerson: () => void;
  onOrgCreated: (org: SimpleEntity) => void;
  onProjectCreated: (project: SimpleEntity) => void;
  onPersonCreated: (person: SimpleEntity) => void;
}

/**
 * Bundles the three "create new entity" sub-modals shown from
 * EditMetadataModal so the main file stays focused on the metadata form.
 */
export function MetadataSubModals({
  organizations,
  showCreateOrg,
  showCreateProject,
  showCreatePerson,
  onCloseOrg,
  onCloseProject,
  onClosePerson,
  onOrgCreated,
  onProjectCreated,
  onPersonCreated,
}: MetadataSubModalsProps) {
  return (
    <>
      <CreateOrganizationModal open={showCreateOrg} onClose={onCloseOrg} onCreated={onOrgCreated} />
      <CreateProjectSubModal
        open={showCreateProject}
        onClose={onCloseProject}
        onCreated={onProjectCreated}
        organizations={organizations}
      />
      <CreatePersonSubModal
        open={showCreatePerson}
        onClose={onClosePerson}
        onCreated={onPersonCreated}
        organizations={organizations}
      />
    </>
  );
}
