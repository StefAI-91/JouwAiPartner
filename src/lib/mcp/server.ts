import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTools } from "./tools/search";
import { registerMeetingTools } from "./tools/meetings";
import { registerActionTools } from "./tools/actions";
import { registerDecisionTools } from "./tools/decisions";
import { registerOrganizationTools } from "./tools/organizations";
import { registerProjectTools } from "./tools/projects";
import { registerPeopleTools } from "./tools/people";
import { registerOrganizationOverviewTools } from "./tools/get-organization-overview";
import { registerListMeetingsTools } from "./tools/list-meetings";
import { registerCorrectExtractionTools } from "./tools/correct-extraction";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "jouwaipartner-knowledge",
    version: "1.0.0",
    description:
      "JouwAIPartner kennisbasis — organisaties, projecten, mensen, meetings, besluiten, actiepunten",
  });

  registerSearchTools(server);
  registerMeetingTools(server);
  registerActionTools(server);
  registerDecisionTools(server);
  registerOrganizationTools(server);
  registerProjectTools(server);
  registerPeopleTools(server);
  registerOrganizationOverviewTools(server);
  registerListMeetingsTools(server);
  registerCorrectExtractionTools(server);

  // Register the system prompt as an MCP prompt
  server.prompt(
    "kennisbasis-context",
    "System prompt voor het gebruik van de JouwAIPartner kennisbasis",
    async () => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Je hebt toegang tot de JouwAIPartner kennisbasis via MCP.
Deze bevat meeting transcripts, besluiten, actiepunten, inzichten en behoeften.

BELANGRIJK — bronvermelding en eerlijkheid:
- Geef NOOIT een antwoord zonder bron. Elk feit moet herleidbaar zijn naar een meeting of extractie.
- Als je geen relevante bronnen vindt, zeg dat expliciet: "Hier heb ik geen informatie over in de kennisbasis."
- Verzin geen informatie. Liever eerlijk "ik weet het niet" dan een onbetrouwbaar antwoord.

Bij het beantwoorden van vragen:
- Verwijs altijd naar de bron: meeting titel, datum, en indien beschikbaar het transcript-citaat.
- Toon de verificatie-status: "AI (confidence: X%)" of "Geverifieerd" als een extractie gecorrigeerd is.
- Als je meerdere relevante meetings vindt, geef de meest recente.
- Bij actiepunten, vermeld altijd de eigenaar en deadline.
- Bij besluiten, vermeld wie het besluit nam en wanneer.`,
          },
        },
      ],
    }),
  );

  return server;
}
