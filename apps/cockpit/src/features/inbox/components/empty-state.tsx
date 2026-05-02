import { Inbox } from "lucide-react";

export function InboxEmptyState({
  filter,
}: {
  filter: "wacht_op_mij" | "wacht_op_klant" | "geparkeerd";
}) {
  const messages: Record<typeof filter, { title: string; body: string }> = {
    wacht_op_mij: {
      title: "Niets meer om te reviewen",
      body: "Klant-feedback en eindgebruiker-meldingen verschijnen hier zodra ze binnenkomen.",
    },
    wacht_op_klant: {
      title: "Geen open vragen",
      body: "Vragen waar de klant nog op moet reageren komen hier te staan.",
    },
    geparkeerd: {
      title: "Geen geparkeerde items",
      body: "Items die je 'later' bewaart staan hier verzameld.",
    },
  };
  const { title, body } = messages[filter];
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </span>
      <h2 className="text-[14px] font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="max-w-[40ch] text-[12.5px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
