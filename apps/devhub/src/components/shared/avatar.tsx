/**
 * Simple initials avatar for people/users.
 */
export function Avatar({ name, size = "sm" }: { name: string | null; size?: "sm" | "md" }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizeClass = size === "md" ? "size-8 text-xs" : "size-7 text-[0.65rem]";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ${sizeClass}`}
      title={name ?? undefined}
    >
      {initials}
    </span>
  );
}
