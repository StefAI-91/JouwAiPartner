import { FolderKanban } from "lucide-react";

export default function PortalHomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FolderKanban className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl">Welkom bij het portaal</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Hier zie je straks de voortgang van jouw projecten en kun je feedback delen met het team.
        </p>
      </div>
    </div>
  );
}
