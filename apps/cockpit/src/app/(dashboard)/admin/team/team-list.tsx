import { UserRow } from "./user-row";

export interface TeamMemberView {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
  last_sign_in_at: string | null;
  banned_until: string | null;
  project_ids: string[];
}

export interface ProjectOption {
  id: string;
  name: string;
}

export function TeamList({
  members,
  projects,
  adminCount,
}: {
  members: TeamMemberView[];
  projects: ProjectOption[];
  adminCount: number;
}) {
  if (members.length === 0) {
    return (
      <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">Nog geen teamleden.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_120px_140px_120px_40px] gap-4 border-b border-border/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <div>Gebruiker</div>
        <div>Rol</div>
        <div>Laatste login</div>
        <div>Projecten</div>
        <div />
      </div>
      <div className="divide-y divide-border/40">
        {members.map((m) => (
          <UserRow
            key={m.id}
            member={m}
            projects={projects}
            isLastAdmin={m.role === "admin" && adminCount <= 1}
          />
        ))}
      </div>
    </div>
  );
}
