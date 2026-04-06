import {
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getMeetingForReviewChat } from "@repo/database/queries/review";
import { createClient } from "@repo/database/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const messages: UIMessage[] = body.messages;
    const meetingId: string | undefined = body.meetingId;

    if (!meetingId || typeof meetingId !== "string") {
      return new Response("Missing meetingId", { status: 400 });
    }

    const meeting = await getMeetingForReviewChat(meetingId, supabase);
    if (!meeting) return new Response("Meeting not found", { status: 404 });

    // Build context for the system prompt
    const participants =
      meeting.meeting_participants?.map((mp) => mp.person.name).join(", ") || "Onbekend";
    const projects =
      meeting.meeting_projects?.map((mp) => mp.project.name).join(", ") || "Geen";
    const org = meeting.organization?.name || "Onbekend";

    const extractionsSummary = meeting.extractions
      .map((e, i) => {
        const meta = e.metadata ? ` | metadata: ${JSON.stringify(e.metadata)}` : "";
        const ref = e.transcript_ref ? ` | ref: "${e.transcript_ref}"` : "";
        return `${i + 1}. [${e.type}] (confidence: ${e.confidence ?? "?"}) ${e.content}${ref}${meta} (id: ${e.id})`;
      })
      .join("\n");

    const transcript = meeting.transcript_elevenlabs || meeting.transcript || "";
    const maxTranscriptLength = 30000;
    const truncatedTranscript =
      transcript.length > maxTranscriptLength
        ? transcript.slice(0, maxTranscriptLength) + "\n\n[... transcript ingekort ...]"
        : transcript;

    const systemPrompt = `Je bent de Review Assistent van Jouw AI Partner. Je helpt de reviewer om een meeting te beoordelen.
Je spreekt Nederlands, tenzij de gebruiker Engels spreekt.

## Meeting Context
- **Titel:** ${meeting.title || "Onbekend"}
- **Datum:** ${meeting.date || "Onbekend"}
- **Type:** ${meeting.meeting_type || "Onbekend"} (${meeting.party_type || "?"})
- **Organisatie:** ${org}
- **Deelnemers:** ${participants}
- **Projecten:** ${projects}

## AI Samenvatting
${meeting.summary || "Geen samenvatting beschikbaar."}

## Gevonden Extracties
${extractionsSummary || "Geen extracties gevonden."}

## Transcript
${truncatedTranscript || "Geen transcript beschikbaar."}

## Jouw Rol
Je begeleidt de reviewer stap voor stap door de meeting:
1. Begin met een korte samenvatting van waar de meeting over ging
2. Loop de extracties langs, vraag of ze kloppen
3. Verwijs naar het transcript als bewijs
4. Help bij het concreter maken van actiepunten
5. Vraag of er dingen missen die je niet hebt opgepikt

Wanneer de reviewer een extractie wil goedkeuren, afkeuren, of aanpassen, gebruik dan de juiste tool.
Wanneer de reviewer een taak wil aanmaken van een actiepunt, gebruik dan de createTask tool.

Wees beknopt maar grondig. Stel gerichte vragen. Citeer het transcript waar relevant.`;

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: {
        approveExtraction: tool({
          description: "Keur een extractie goed. Gebruik het extraction ID uit de context.",
          inputSchema: z.object({
            extractionId: z.string().uuid().describe("ID van de extractie"),
          }),
          execute: async ({ extractionId }) => ({
            success: true,
            message: `Extractie ${extractionId.slice(0, 8)}... goedgekeurd`,
          }),
        }),
        rejectExtraction: tool({
          description: "Wijs een extractie af.",
          inputSchema: z.object({
            extractionId: z.string().uuid().describe("ID van de extractie"),
            reason: z.string().describe("Reden voor afwijzing"),
          }),
          execute: async ({ extractionId, reason }) => ({
            success: true,
            message: `Extractie ${extractionId.slice(0, 8)}... afgewezen: ${reason}`,
          }),
        }),
        updateExtraction: tool({
          description: "Pas de inhoud of het type van een extractie aan.",
          inputSchema: z.object({
            extractionId: z.string().uuid().describe("ID van de extractie"),
            content: z.string().optional().describe("Nieuwe inhoud"),
            type: z
              .enum(["decision", "action_item", "need", "insight"])
              .optional()
              .describe("Nieuw type"),
          }),
          execute: async ({ extractionId, content, type }) => {
            const changes = [content ? "inhoud" : null, type ? `type → ${type}` : null]
              .filter(Boolean)
              .join(", ");
            return {
              success: true,
              message: `Extractie ${extractionId.slice(0, 8)}... aangepast: ${changes}`,
            };
          },
        }),
        createTask: tool({
          description:
            "Maak een taak aan van een actiepunt. Vraag altijd om bevestiging van de titel, wie, en deadline.",
          inputSchema: z.object({
            extractionId: z.string().uuid().describe("ID van de extractie"),
            title: z.string().describe("Taakomschrijving"),
            assignee: z.string().optional().describe("Naam van de persoon"),
            deadline: z.string().optional().describe("Deadline in YYYY-MM-DD formaat"),
          }),
          execute: async ({ extractionId, title, assignee, deadline }) => ({
            success: true,
            message: `Taak aangemaakt: "${title}"${assignee ? ` → ${assignee}` : ""}${deadline ? ` (deadline: ${deadline})` : ""}`,
            taskId: "mock-task-id",
          }),
        }),
        finishReview: tool({
          description:
            "Rond de review af en markeer de meeting als geverifieerd. Gebruik dit pas als alle extracties zijn doorgelopen.",
          inputSchema: z.object({
            summary: z.string().describe("Korte samenvatting van de review-acties"),
          }),
          execute: async ({ summary }) => ({
            success: true,
            message: `Review afgerond: ${summary}`,
          }),
        }),
      },
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[chat/review] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
