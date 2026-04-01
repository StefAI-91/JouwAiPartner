import { CheckCircle2 } from "lucide-react";
import { formatDateLong } from "@/lib/format";

interface VerificationBadgeProps {
  verifierName: string | null;
  verifiedAt: string | null;
}

export function VerificationBadge({ verifierName, verifiedAt }: VerificationBadgeProps) {
  if (!verifierName || !verifiedAt) return null;

  const formattedDate = formatDateLong(verifiedAt);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      <span>Verified by {verifierName} on {formattedDate}</span>
    </div>
  );
}
