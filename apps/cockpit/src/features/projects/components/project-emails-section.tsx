import Link from "next/link";

const EMAIL_TYPE_LABELS: Record<string, string> = {
  project_communication: "Project",
  sales: "Sales",
  internal: "Intern",
  administrative: "Admin",
  legal_finance: "Juridisch/Financieel",
  newsletter: "Nieuwsbrief",
  notification: "Notificatie",
  other: "Overig",
};

export interface ProjectEmail {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_address: string;
  date: string;
  snippet: string | null;
  email_type: string | null;
  party_type: string | null;
  verification_status: string;
}

export function EmailsSection({ emails }: { emails: ProjectEmail[] }) {
  if (emails.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Geen emails gekoppeld aan dit project
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <Link
          key={email.id}
          href={
            email.verification_status === "draft"
              ? `/review/email/${email.id}`
              : `/emails/${email.id}`
          }
          className="block rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold">
                {email.subject ?? "(geen onderwerp)"}
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Van: {email.from_name ?? email.from_address}
              </p>
              {email.date && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(email.date).toLocaleDateString("nl-NL", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {email.email_type && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                  {EMAIL_TYPE_LABELS[email.email_type] ?? email.email_type}
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  email.verification_status === "verified"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {email.verification_status}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
