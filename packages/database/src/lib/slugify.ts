/**
 * Converteer een naam naar een URL-veilige slug (lowercase, kebab-case,
 * zonder diacritics of niet-ASCII tekens). Herbruikbaar voor themes en
 * toekomstige slug-gebaseerde entities.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // strip combining diacritics via Unicode mark property
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
