"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { createOrganizationAction } from "../actions/organizations";
import { ORG_TYPES } from "@repo/database/constants/organizations";
import { ORG_TYPE_LABELS } from "@/components/shared/org-type-labels";

// Types waar email + email-domeinen relevant zijn — adviseurs en leveranciers
// hebben vaak een vast email-adres en een eigen domein dat we kunnen matchen
// op inkomende post.
const TYPES_WITH_EMAIL_FIELDS = ["advisor", "supplier"];

function parseDomains(input: string): string[] {
  return input
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

export function AddOrganizationButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<string>("client");
  const [email, setEmail] = useState("");
  const [domainsInput, setDomainsInput] = useState("");

  const showEmailFields = TYPES_WITH_EMAIL_FIELDS.includes(type);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createOrganizationAction({
        name: name.trim(),
        type: type as (typeof ORG_TYPES)[number],
        email: showEmailFields && email.trim() ? email.trim() : null,
        email_domains: showEmailFields ? parseDomains(domainsInput) : undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setName("");
        setType("client");
        setEmail("");
        setDomainsInput("");
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="size-4" />
        Organisatie toevoegen
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nieuwe organisatie">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
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
              placeholder="Naam van de organisatie"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {ORG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ORG_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>

          {showEmailFields && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  E-mailadres <span className="text-muted-foreground">(optioneel)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="info@finconnect.nl"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  E-maildomeinen{" "}
                  <span className="text-muted-foreground">(komma-gescheiden, optioneel)</span>
                </label>
                <input
                  type="text"
                  value={domainsInput}
                  onChange={(e) => setDomainsInput(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="finconnect.nl, finconnect.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Mails vanaf deze domeinen worden automatisch aan deze organisatie gekoppeld.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Aanmaken..." : "Aanmaken"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
