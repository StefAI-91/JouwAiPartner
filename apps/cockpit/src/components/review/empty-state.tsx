interface ReviewEmptyStateProps {
  stats: { verifiedToday: number; totalVerified: number };
}

function Mascot() {
  return (
    <div className="relative mx-auto h-24 w-24 animate-[float_3s_ease-in-out_infinite]">
      <div className="h-24 w-24 rounded-3xl bg-white shadow-lg">
        {/* Eyes */}
        <div className="flex items-center justify-center gap-4 pt-8">
          <div className="h-3 w-3 rounded-full bg-foreground" />
          <div className="h-3 w-3 rounded-full bg-foreground" />
        </div>
        {/* Smile */}
        <div className="mx-auto mt-2 h-1.5 w-6 rounded-full bg-foreground/20" />
      </div>
    </div>
  );
}

export function ReviewEmptyState({ stats }: ReviewEmptyStateProps) {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      {/* Mascot */}
      <Mascot />

      {/* Chat bubble */}
      <div className="mt-8 rounded-[2rem] bg-white p-8 shadow-sm">
        <h2 className="text-center font-heading text-xl font-semibold text-primary">
          All caught up!
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          No meetings awaiting review right now. New meetings will appear here automatically when
          they come in.
        </p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/50 p-4 text-center">
            <p className="font-heading text-2xl font-bold text-primary">{stats.verifiedToday}</p>
            <p className="text-xs text-muted-foreground">Verified today</p>
          </div>
          <div className="rounded-2xl bg-muted/50 p-4 text-center">
            <p className="font-heading text-2xl font-bold text-primary">{stats.totalVerified}</p>
            <p className="text-xs text-muted-foreground">Total verified</p>
          </div>
        </div>
      </div>

      {/* Float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
