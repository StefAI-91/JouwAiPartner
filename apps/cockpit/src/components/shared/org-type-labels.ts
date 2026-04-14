/**
 * Nederlandse labels voor organizations.type DB-waardes.
 *
 * DB-waardes blijven Engels (zie RULE-007, style-guide sectie 11).
 * De UI-laag rendert deze mapping zodat gebruikers Nederlandse labels zien.
 *
 * Gebruik: `ORG_TYPE_LABELS[org.type] ?? org.type`
 */
export const ORG_TYPE_LABELS: Record<string, string> = {
  client: "Klant",
  partner: "Partner",
  supplier: "Leverancier",
  advisor: "Adviseur",
  internal: "Intern",
  other: "Overig",
};
