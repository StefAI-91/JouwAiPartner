import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Mail } from "lucide-react";
import type { EmailListItem } from "@repo/database/queries/emails";
import { EmailList } from "@/components/emails/email-list";

/**
 * E-mails-sectie op de administratie-detailpagina. Toont alle mails die
 * aan deze organisatie gekoppeld zijn (via emails.organization_id).
 * Hergebruikt de bestaande EmailList-component met een compacte kaart-wrapper.
 */
export function AdministratieEmails({ emails, total }: { emails: EmailListItem[]; total: number }) {
  return (
    <Card>
      <CardHeader className="border-b border-border/50">
        <CardTitle>E-mails ({total})</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {emails.length === 0 ? (
          <div className="py-10 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nog geen gekoppelde e-mails. Zodra een mail vanaf een bekend adres of domein
              binnenkomt, verschijnt die hier automatisch.
            </p>
          </div>
        ) : (
          <EmailList emails={emails} />
        )}
      </CardContent>
    </Card>
  );
}
