import Link from "next/link";

export default function ThemeNotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h2 className="font-heading text-xl font-semibold">Thema niet gevonden</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Dit thema bestaat niet of is gearchiveerd.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-[#006B3F] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        Terug naar dashboard
      </Link>
    </div>
  );
}
