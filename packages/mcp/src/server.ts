import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSearchTools } from "./tools/search";
import { registerMeetingTools } from "./tools/meetings";
import { registerActionTools } from "./tools/actions";

import { registerOrganizationTools } from "./tools/organizations";
import { registerProjectTools } from "./tools/projects";
import { registerPeopleTools } from "./tools/people";
import { registerOrganizationOverviewTools } from "./tools/get-organization-overview";
import { registerListMeetingsTools } from "./tools/list-meetings";
import { registerCorrectExtractionTools } from "./tools/correct-extraction";
import { registerDecisionTools } from "./tools/decisions";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "jouwaipartner-knowledge",
    version: "1.0.0",
    description:
      "JouwAIPartner kennisbasis — organisaties, projecten, mensen, meetings, actiepunten",
  });

  registerSearchTools(server);
  registerMeetingTools(server);
  registerActionTools(server);

  registerOrganizationTools(server);
  registerProjectTools(server);
  registerPeopleTools(server);
  registerOrganizationOverviewTools(server);
  registerListMeetingsTools(server);
  registerCorrectExtractionTools(server);
  registerDecisionTools(server);

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
Deze bevat meeting samenvattingen (met besluiten, behoeften, signalen) en actiepunten.

BELANGRIJK — bronvermelding en eerlijkheid:
- Geef NOOIT een antwoord zonder bron. Elk feit moet herleidbaar zijn naar een meeting.
- Als je geen relevante bronnen vindt, zeg dat expliciet: "Hier heb ik geen informatie over in de kennisbasis."
- Verzin geen informatie. Liever eerlijk "ik weet het niet" dan een onbetrouwbaar antwoord.

Bij het beantwoorden van vragen:
- Verwijs altijd naar de bron: meeting titel, datum, en indien beschikbaar het transcript-citaat.
- Meeting samenvattingen bevatten besluiten, behoeften, signalen en context als narratief. Gebruik get_meeting_summary of search_knowledge om deze informatie te vinden.
- Bij actiepunten, vermeld altijd de eigenaar en deadline.
- Als je meerdere relevante meetings vindt, geef de meest recente.`,
          },
        },
      ],
    }),
  );

  return server;
}
