const PREFIX_PATTERN = /^\([^)]+\):\s*/;

export function stripTitlePrefix(title: string): string {
  return title.replace(PREFIX_PATTERN, "").trim();
}
