# Feature: Agents

Observability-dashboard voor AI-agents. Laat real-time zien welke agents draaien, welke metrics ze hebben, en wat hun recente activiteit is. Read-only — er worden hier geen agents gestart of gestopt.

## Menu per laag

### `components/`

UI voor de `/agents` dashboard. Geen barrel.

| File                  | Rol                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `system-overview.tsx` | Kop-sectie met geaggregeerde stats (totaal runs, errors, laatste activiteit).                                            |
| `agent-card.tsx`      | Kaart per agent met quadrant-label, metrics en status.                                                                   |
| `activity-feed.tsx`   | Chronologische feed van recente agent-runs.                                                                              |
| `quadrant-styles.ts`  | Styling-tokens per agent-quadrant (Cockpit / DevHub / Portal / Delivery). Shared tussen `agent-card` en `activity-feed`. |

## Gerelateerde packages (NIET in deze feature)

| Pad                                 | Rol                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `@repo/database/queries/agent-runs` | `listAgentRuns`, metrics-aggregaties — voedt het dashboard.                                |
| `@repo/ai/agents/registry`          | `AgentQuadrant`-type + agent-definities. Single source of truth voor welke agents bestaan. |

## Design decisions

- **Geen `actions/`.** Het dashboard is puur read-only. Als er in de toekomst "restart agent"-knoppen komen, woont die action hier.
- **De dev-detector action hoort NIET bij deze feature.** Dat is een developer-tool om de theme-detector handmatig te draaien vanuit `/dev/detector/`, geen onderdeel van het observability-dashboard. Die blijft horizontaal in `@/actions/`.
- **`quadrant-styles.ts` is een `.ts`-file, geen `.tsx`.** Alleen styling-tokens (Tailwind class-strings). Geen JSX.
- **Dependency op `@repo/ai/agents/registry`.** De registry is de bron van waarheid voor welke agents bestaan — het dashboard leest daaruit welke quadrants en welke agent-types getoond moeten worden.
