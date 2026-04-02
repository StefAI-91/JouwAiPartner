import { Sparkles } from "lucide-react";

interface GreetingProps {
  userName: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Goedenacht";
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export function Greeting({ userName }: GreetingProps) {
  const greeting = getGreeting();
  const name = userName?.split(" ")[0] ?? "";

  return (
    <div>
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary/70" />
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}
          {name ? `, ${name}` : ""}
        </h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Hier is je AI-briefing van de laatste meetings.
      </p>
    </div>
  );
}
