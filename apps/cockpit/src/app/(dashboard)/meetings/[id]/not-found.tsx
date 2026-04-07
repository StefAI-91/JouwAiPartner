import Link from "next/link";

export default function MeetingNotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Meeting not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This meeting does not exist or has not been verified yet.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-[#006B3F] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
