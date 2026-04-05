import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { WeeklySummaryOutputSchema, type WeeklySummaryOutput } from "../validations/weekly-summary";

export type { WeeklySummaryOutput };

const SYSTEM_PROMPT = `Je bent een management-analist voor een consultancy/software bureau. Je genereert een wekelijks management overzicht.

Je krijgt per actief project:
- De huidige AI-briefing (cumulatieve projectstatus)
- Openstaande taken met status, toewijzing en deadlines
- Meetings van deze week (indien aanwezig)
- Nieuwe extracties van deze week (besluiten, actiepunten, needs, insights)

Je genereert:

1. MANAGEMENT SUMMARY — 3-5 zinnen die de overall status van het bedrijf weergeven.
   Hoeveel projecten op koers, hoeveel risico, key highlights en kritieke aandachtspunten.
   Dit is het eerste wat een manager leest — wees direct en to-the-point.

2. PROJECT HEALTH — Per project een gezondheidscheck:
   - status: groen (op koers), oranje (aandacht nodig), rood (risico/probleem)
   - summary: 2-3 zinnen over de projectstatus
   - risks: concrete risico's
   - recommendations: acties voor management
   Sorteer: rood eerst, dan oranje, dan groen.

3. CROSS-PROJECT RISKS — Patronen die meerdere projecten raken.
   Bijv. structureel onopgepakte taken, meerdere gemiste deadlines, capaciteitsproblemen.

4. TEAM INSIGHTS — Wie heeft te veel op z'n bord? Wie pakt taken niet op?
   Baseer dit op de task-verdeling en status.

5. FOCUS NEXT WEEK — Top 3-5 concrete, prioritaire acties voor volgende week.
   Noem project, persoon en deadline waar mogelijk.

REGELS:
- Schrijf in het Nederlands.
- Baseer je ALLEEN op de aangeleverde data. Verzin niets.
- Wees direct, actiegericht en concreet. Geen vage adviezen.
- Als een project geen recente meetings of updates heeft, noem dat als risico.
- Overdue taken zijn altijd een risico — benoem ze expliciet.
- Als er weinig data is, wees dan kort. Liever 2 goede inzichten dan 5 vage.`;

export interface WeeklyProjectInput {
  project_id: string;
  project_name: string;
  briefing: string | null;
  tasks: {
    title: string;
    status: string;
    assigned_to: string | null;
    due_date: string | null;
  }[];
  meetings_this_week: {
    title: string | null;
    date: string | null;
    meeting_type: string | null;
    summary: string | null;
  }[];
  extractions_this_week: {
    type: string;
    content: string;
  }[];
}

export async function runWeeklySummarizer(
  weekLabel: string,
  projects: WeeklyProjectInput[],
): Promise<WeeklySummaryOutput> {
  const projectsText = projects
    .map((p) => {
      const parts = [`## ${p.project_name}`];

      if (p.briefing) {
        parts.push(`\n**AI Briefing:**\n${p.briefing}`);
      } else {
        parts.push("\n**AI Briefing:** Geen briefing beschikbaar.");
      }

      if (p.tasks.length > 0) {
        parts.push("\n**Taken:**");
        for (const t of p.tasks) {
          const assignee = t.assigned_to ?? "niet toegewezen";
          const due = t.due_date ?? "geen deadline";
          parts.push(`- [${t.status}] ${t.title} (${assignee}, ${due})`);
        }
      } else {
        parts.push("\n**Taken:** Geen taken.");
      }

      if (p.meetings_this_week.length > 0) {
        parts.push("\n**Meetings deze week:**");
        for (const m of p.meetings_this_week) {
          const date = m.date ?? "onbekend";
          const type = m.meeting_type ?? "overig";
          parts.push(`- ${date} (${type}): ${m.title}`);
          if (m.summary) parts.push(`  ${m.summary}`);
        }
      }

      if (p.extractions_this_week.length > 0) {
        parts.push("\n**Nieuwe extracties deze week:**");
        for (const e of p.extractions_this_week) {
          parts.push(`- [${e.type}] ${e.content}`);
        }
      }

      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const userContent = [
    `Week: ${weekLabel}`,
    `Aantal actieve projecten: ${projects.length}`,
    `\n--- PROJECT DATA ---\n\n${projectsText}`,
  ].join("\n");

  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5-20250514"),
    schema: WeeklySummaryOutputSchema,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { role: "user", content: userContent },
    ],
  });

  return object;
}
