# Claude Desktop skills voor Jouw AI Partner

Deze map bevat skill-templates die je in Claude Desktop kunt laden om terugkerende workflows te automatiseren. Elke skill veronderstelt dat je Claude Desktop verbonden hebt met de JouwAIPartner MCP-server zodat de MCP-tools beschikbaar zijn.

## Beschikbare skills

| Bestand                   | Doel                                                             | Tools die nodig zijn                                                                                                               |
| ------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `project-report-skill.md` | Genereert een warm-persoonlijk statusrapport per project als PDF | MCP: `get_projects`, `get_project_context`, `get_project_issues`, `get_project_activity`, `get_issue_detail` + Anthropic PDF-skill |

## Installatie — per skill

### Optie A: Claude Desktop Project (aanbevolen voor herhaald gebruik)

1. Open Claude Desktop.
2. Klik linksboven op **Projects** → **New Project**.
3. Geef het project een naam (bijv. _"Jouw AI Partner — Project Reports"_).
4. Open het project → klik op **Custom Instructions**.
5. Kopieer de volledige inhoud van het gewenste skill-bestand (bijv. `project-report-skill.md`) en plak het in het Custom Instructions veld.
6. Zorg dat de MCP-server verbonden is (zie "MCP-connectie" hieronder).
7. Zorg dat de **PDF-skill** geactiveerd is in Claude Desktop (Settings → Skills → PDF: aan).
8. Start een nieuwe chat binnen dit project — de skill is nu actief.

### Optie B: Eenmalig via systeem-prompt

Voor een eenmalige rapportage:

1. Start een nieuwe chat in Claude Desktop.
2. Plak de volledige skill-tekst als eerste bericht.
3. Voeg direct daaronder je verzoek toe (bijv. _"Maak een rapport voor Loyalty App over de laatste 14 dagen"_).

Deze aanpak mist de voordelen van een Project (bewaarde context, chat-historie per project), maar werkt prima voor ad-hoc gebruik.

## MCP-connectie

De skills leunen op de JouwAIPartner MCP-server. Controleer dat deze draait en dat Claude Desktop hem heeft opgepakt:

- **Lokaal:** de server staat in `packages/mcp/`. Zie de root `README.md` voor het starten.
- **Verificatie in Claude Desktop:** start een nieuwe chat en vraag _"Welke MCP-tools heb je beschikbaar?"_. Je zou minimaal `get_projects`, `get_project_issues`, `get_project_context`, `get_project_activity` en `get_issue_detail` moeten zien.

Als de tools niet verschijnen: herstart Claude Desktop nadat je de MCP-configuratie hebt gewijzigd.

## Skills aanpassen

Pas een skill niet in Claude Desktop zelf aan — maak je wijzigingen in het bronbestand in deze map, commit naar git, en plak de bijgewerkte versie opnieuw in het Project. Zo blijft de source of truth in de repo en kunnen anderen dezelfde versie gebruiken.

## Nieuwe skill toevoegen

1. Maak een nieuw markdown-bestand met een sprekende naam (`xyz-skill.md`).
2. Start met een korte rolbeschrijving ("Je bent een ...").
3. Beschrijf: wanneer activeren, welke workflow, welke tools, welke toon, wat NIET doen, een voorbeeld-interactie.
4. Voeg het bestand toe aan de tabel in deze README.
5. Test via een losse chat voordat je 'm als Project-skill installeert.
