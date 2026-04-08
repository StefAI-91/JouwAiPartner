import { Crown } from "lucide-react";

export default function LeadershipPage() {
  return (
    <div className="px-4 py-16 text-center lg:px-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
        <Crown className="h-8 w-8 text-primary/40" />
      </div>
      <h2 className="mt-6 font-heading text-xl font-semibold">Leadership Intelligence</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Strategische inzichten uit gesprekken van het managementteam. Analyse van richting,
        investeringsbeslissingen en partnership-kansen.
      </p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
        <Crown className="h-3.5 w-3.5" />
        Coming soon
      </div>
    </div>
  );
}
