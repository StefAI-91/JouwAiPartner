const MEETING_TYPE_STYLES: Record<string, string> = {
  sales: "bg-blue-100 text-blue-700",
  discovery: "bg-purple-100 text-purple-700",
  internal_sync: "bg-gray-100 text-gray-700",
  review: "bg-green-100 text-green-700",
  strategy: "bg-amber-100 text-amber-700",
  partner: "bg-pink-100 text-pink-700",
};

export function MeetingTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const style = MEETING_TYPE_STYLES[type] ?? "bg-gray-100 text-gray-700";
  const label = type.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {label}
    </span>
  );
}
