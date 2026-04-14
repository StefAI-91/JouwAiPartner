/** Convert empty strings to null to prevent uuid/url validation errors. */
export function cleanInput<T extends Record<string, unknown>>(input: T): T {
  const cleaned = { ...input };
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === "") {
      (cleaned as Record<string, unknown>)[key] = null;
    }
  }
  return cleaned;
}
