# Micro Sprint PR-019: Bulk Cluster Cleanup (ungrouped issues)

## Doel

Een on-demand opruim-tool voor de "Niet gegroepeerd"-view in DevHub: één knop per project die alle open ungrouped `userback`-issues door Claude Haiku heen haalt en cluster-suggesties teruggeeft (matchen aan bestaand topic, of voorstel voor nieuw topic). Mens accepteert per cluster met één klik, hergebruikt de bestaande `linkIssueAction` / `createTopicAction`. Geen schema-changes, geen embeddings, geen persistente suggesties — een incident-tool om bestaande achterstand te ruimen, niet een workflow.

**Concrete aanleiding (productie, 2026-04-28)**: Cai Studio 67 open ungrouped issues (27 triage + 16 backlog + 20 todo + 4 in_progress), BnB Keurmerk 2. Handmatig curaten is onhoudbaar; topics zijn de bron voor de Portal-roadmap dus zonder opruim-tool blijft die roadmap achter op de werkelijkheid.

### Positionering t.o.v. PR-014 (Topic-Curator Agent) — KRITIEK

Deze sprint is **geen duplicate** van PR-014. Beide blijven naast elkaar bestaan:

| Aspect       | PR-014 Topic-Curator                                       | PR-019 Bulk Cleanup (deze)                                                      |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Trigger      | Per-issue, at-intake (Portal feedback / cron / handmatig)  | On-demand knop per project, batch                                               |
| Doel         | Voorkomt nieuwe achterstand                                | Ruimt bestaande achterstand op                                                  |
| Model        | Claude Sonnet + Cohere embed-v4 + pgvector top-K           | Claude Haiku, alleen tekst, geen embeddings                                     |
| Persistentie | Suggestie in `agent_suggestions` (PR-018) of `topic_event` | Niet-persistent — server action returnt, UI toont, "regenereer" is opnieuw call |
| Dependencies | PR-008, PR-009, PR-018                                     | Alleen bestaande topics-feature + bestaande issues-feature                      |
| Hergebruik   | Eigen flow                                                 | Hergebruikt `createTopicAction` + `linkIssueAction` één-op-één                  |

**Mentaal model**: PR-019 is "we hebben weer wat laten liggen, ruim op"; PR-014 is "doe het meteen goed bij intake".

## Requirements

| ID          | Beschrijving                                                                                                                                                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-AI-100   | Agent `bulk-cluster-cleanup` in `packages/ai/src/agents/bulk-cluster-cleanup/` — registreer in `agents/registry.ts` zodat hij verschijnt in de DevHub `/agents` observability-pagina                                                           |
| PR-AI-101   | Model: Claude Haiku (`claude-haiku-4-5` via `@ai-sdk/anthropic`) — past in CLAUDE.md model-tier-policy: simple structured output → Haiku                                                                                                       |
| PR-AI-102   | Geen embeddings, geen pgvector-call. Input is puur tekst                                                                                                                                                                                       |
| PR-AI-103   | Input: `projectId` + lijst open ungrouped issues (id, number, title, description, ai_classification) + lijst open topics van project (id, title, description, type, status)                                                                    |
| PR-AI-104   | Output (Zod-schema, `generateObject`): `clusters: Array<{ kind: 'match' \| 'new', match_topic_id?, new_topic?: { title, description, type }, issue_ids: uuid[], rationale: string }>`                                                          |
| PR-AI-105   | Geen `confidence` per cluster nodig — Haiku doet niet betrouwbaar self-scoring; UI toont alleen rationale                                                                                                                                      |
| PR-AI-106   | `ai_classification` (al gevuld op de meeste issues) wordt als input meegegeven zodat het model type/severity niet opnieuw hoeft te bepalen                                                                                                     |
| PR-REQ-200  | Server Action `runBulkClusterCleanup({ projectId })` in `apps/devhub/src/actions/bulk-cluster-cleanup.ts` (platform-action, niet feature-scoped — zie design decision) — auth check, project-access check, return `{ clusters }`               |
| PR-REQ-201  | Hardgecodeerd filter in de action: `topic_id IS NULL AND status IN ('triage','backlog','todo','in_progress')`. Niet afhankelijk van wat user in UI-filters zet                                                                                 |
| PR-REQ-202  | Eén Haiku-call per project, niet cross-project                                                                                                                                                                                                 |
| PR-REQ-203  | Server action faalt netjes als project geen ungrouped open issues heeft → `{ clusters: [] }`                                                                                                                                                   |
| PR-REQ-204  | Acceptance-flow A: `acceptClusterToExistingAction({ topicId, issueIds })` → batch-aanroep van bestaande `linkIssueAction` (één call per issue, in volgorde, in dezelfde request)                                                               |
| PR-REQ-205  | Acceptance-flow B: `acceptClusterAsNewAction({ topicPayload, issueIds })` → bestaande `createTopicAction` + batch `linkIssueAction`                                                                                                            |
| PR-REQ-206  | Beide accept-actions hergebruiken bestaande actions één-op-één — geen duplicate validatie of mutation-laag. Zie `apps/devhub/src/features/topics/actions/{topics.ts,linking.ts}`                                                               |
| PR-REQ-207  | UI: nieuwe component `cluster-suggestions-panel.tsx` + child `cluster-suggestion-card.tsx` (één per cluster) in `apps/devhub/src/components/cluster-suggestions/` (compositie), bovenop de issue-list op `/issues?project=<id>&ungrouped=true` |
| PR-REQ-208  | UI-knop "Regenereer suggesties" → opnieuw `runBulkClusterCleanup` aanroepen. Geen state-persistentie tussen runs                                                                                                                               |
| PR-REQ-209  | Per cluster-card: lijst van issue-titels (klikbaar naar issue-detail in nieuwe tab), match-target ("→ Topic _Wit scherm_" óf "→ Nieuw topic _<title>_"), rationale, twee knoppen                                                               |
| PR-REQ-210  | Default-filter aanpassen op `ungroupedOnly`-view: `status NOT IN ('done','cancelled')` standaard actief. Done/cancelled blijven via expliciete status-filter zichtbaar                                                                         |
| PR-RULE-100 | Hard-regel: agent doet GEEN auto-link en GEEN auto-create. Mens accepteert per cluster                                                                                                                                                         |
| PR-RULE-101 | De cluster-suggesties zijn niet-persistent. Bij page-refresh of "regenereer" zijn ze weg. Bewust — zie design-decision                                                                                                                         |
| PR-RULE-102 | Eén project per call, geen cross-project clustering                                                                                                                                                                                            |
| PR-SEC-100  | Action checkt: ingelogd, member-of-project (`listAccessibleProjectIds`). Anders 403                                                                                                                                                            |

## Afhankelijkheden

- **PR-001** (topics-tabel) — bestaand
- **PR-002** (topic queries/mutations) — bestaand
- **PR-003** (DevHub topics feature, inclusief `createTopicAction` + `linkIssueAction`) — bestaand
- Bestaand: `packages/ai/src/agents/registry.ts`, `@ai-sdk/anthropic`, `ai` package, Zod
- Bestaand: `apps/devhub/src/features/issues/components/{issue-list,issue-filters,issue-row}.tsx`
- Bestaand: `apps/devhub/src/features/topics/actions/{topics.ts,linking.ts}`
- Bestaand: `packages/database/src/queries/issues/core.ts` (incl. `ungroupedOnly` filter, `listIssues`)
- Bestaand: `packages/database/src/queries/topics/` (candidate-list ophalen)

**Geen** afhankelijkheid van PR-008 (Triage), PR-009 (audit-events), PR-014 (curator), PR-018 (agent_suggestions). Bewust — deze sprint heeft die plumbing niet nodig.

### Beantwoorde vragen / Design decisions (vastgesteld 2026-04-29)

1. **Feature-folder van het panel** → **compositie**: `apps/devhub/src/components/cluster-suggestions/{cluster-suggestions-panel,cluster-suggestion-card}.tsx`. De server actions (`runBulkClusterCleanupAction`, `acceptClusterToExistingAction`, `acceptClusterAsNewAction`) leven als platform-action in `apps/devhub/src/actions/bulk-cluster-cleanup.ts` (samen met de andere DevHub platform-actions zoals `import`, `slack-settings`, `review`). Compositie-keuze is bewust tijdelijk gemarkeerd — als de panel later méér krijgt (bv. cluster-history, undo, presets) kan promotie naar `features/cluster-cleanup/` overwogen worden. Niet nu.
2. **Test-topics in productie** → **niet opruimen in deze sprint**. De twee Cai Studio test-topics ("Hallo", "test", status=`clustering`) blijven staan. Geen migratie, geen runtime-task. Optioneel handmatig via DevHub UI later.
3. **Race condition** (topic verdwijnt tussen call en accept) → **action filtert** clusters waarvan target-topic ondertussen verdwenen is en geeft een waarschuwing terug in payload. UI toont "deze cluster is verlopen, regenereer".
4. **Token-cap per project per dag** → **geen cap nu**. Run kost < $0.05; cap inbouwen is meer code dan het probleem rechtvaardigt. Toevoegen als een gebruiker de knop misbruikt (>10 runs/dag/project gedurende een week).
5. **Description-truncatie** → **400 chars** + `"..."` als langer. Vastleggen als comment in `runBulkClusterCleanupAction` zodat een lezer niet denkt dat dit ruwe data is.

## Visuele referentie

Geen aparte preview-mockup. Past binnen DevHub-stijl (CLAUDE.md §"Tech Stack" + bestaande `IssueFilters`-componenten). Kort:

- Panel verschijnt **alleen** als `?ungrouped=true` actief is en er ≥1 ungrouped open issue is
- Boven de issue-list, onder de filters
- Header: "Cluster-suggesties (Haiku)" + knop "Suggesties ophalen" / na run "Regenereer"
- Per cluster een card: target (existing topic-pill of "Nieuw topic" badge) + rationale (1-2 zinnen, italic muted) + issue-titels (chips) + twee knoppen ("Accepteer" primary, "Negeer" ghost)

## Taken

### 1. Agent-registratie

`packages/ai/src/agents/bulk-cluster-cleanup/`:

```
packages/ai/src/agents/bulk-cluster-cleanup/
├── index.ts             # main agent function
├── prompt.ts            # system prompt
├── schema.ts            # Zod output schema
└── README.md            # rationale + input/output sample
```

`index.ts`:

```typescript
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { bulkClusterOutputSchema } from "./schema";
import { systemPrompt, buildPrompt } from "./prompt";

export type BulkClusterInput = {
  issues: Array<{
    id: string;
    number: number;
    title: string;
    description: string | null; // truncate naar 400 chars in caller
    ai_classification: { type?: string; severity?: string; component?: string } | null;
  }>;
  topics: Array<{
    id: string;
    title: string;
    description: string | null;
    type: "bug" | "feature";
    status: string;
  }>;
};

export async function runBulkClusterCleanup(input: BulkClusterInput) {
  const result = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: bulkClusterOutputSchema,
    system: systemPrompt,
    prompt: buildPrompt(input),
  });
  return result.object;
}
```

Registreer in `packages/ai/src/agents/registry.ts` met `id: 'bulk-cluster-cleanup'`, `model: 'haiku'`, korte beschrijving.

### 2. Schema

`schema.ts`:

```typescript
import { z } from "zod";

export const bulkClusterOutputSchema = z.object({
  clusters: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("match"),
        match_topic_id: z.string().uuid(),
        issue_ids: z.array(z.string().uuid()).min(1),
        rationale: z.string().min(10).max(300),
      }),
      z.object({
        kind: z.literal("new"),
        new_topic: z.object({
          title: z.string().min(3).max(120),
          description: z.string().min(10).max(500),
          type: z.enum(["bug", "feature"]),
        }),
        issue_ids: z.array(z.string().uuid()).min(1),
        rationale: z.string().min(10).max(300),
      }),
    ]),
  ),
});
```

### 3. Prompt

`prompt.ts`:

- Rol: "Je groepeert open ungrouped `userback`-issues onder bestaande topics, of stelt nieuwe topics voor als geen bestaand topic past. Je werkt batch."
- Regels:
  - Issues die niets met elkaar te maken hebben: laat ze in losse single-issue clusters (kind=new) — geen forced merge
  - Bij twijfel tussen match en new: kies new (bestaande topics zijn voor de klant zichtbaar; vervuiling kost meer dan een nieuw topic)
  - Per cluster minimaal 1 issue, maximaal alles wat zinvol samenhangt
  - `type` van een new-topic conservatief afleiden uit `ai_classification.type` van de meeste issues
- Geen few-shot in v1 (Haiku is goedkoop genoeg om iteratief te tunen op echte data)

### 4. Server action (platform-action)

`apps/devhub/src/actions/bulk-cluster-cleanup.ts` — platform-action, niet feature-scoped (zie design decision 1):

```typescript
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createPageClient, getAuthenticatedUser } from "@repo/auth/helpers";
import { listAccessibleProjectIds } from "@repo/auth/access";
import { listIssues } from "@repo/database/queries/issues";
import { listTopics } from "@repo/database/queries/topics";
import { runBulkClusterCleanup } from "@repo/ai/agents/bulk-cluster-cleanup";

const inputSchema = z.object({ projectId: z.string().uuid() });

export async function runBulkClusterCleanupAction(input: { projectId: string }) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };

  const [user, supabase] = await Promise.all([getAuthenticatedUser(), createPageClient()]);
  if (!user) return { error: "unauthorized" };
  const accessible = await listAccessibleProjectIds(user.id, supabase);
  if (!accessible.includes(parsed.data.projectId)) return { error: "forbidden" };

  // Hardgecodeerd filter — onafhankelijk van UI-filters
  const issues = await listIssues(
    {
      projectId: parsed.data.projectId,
      status: ["triage", "backlog", "todo", "in_progress"],
      ungroupedOnly: true,
      limit: 200,
      offset: 0,
    },
    supabase,
  );
  if (issues.length === 0) return { clusters: [] };

  const topics = (await listTopics(parsed.data.projectId, {}, supabase)).filter(
    (t) => !["done", "cancelled", "wont_do"].includes(t.status),
  );

  const result = await runBulkClusterCleanup({
    issues: issues.map((i) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      description: i.description ? i.description.slice(0, 400) : null,
      ai_classification: i.ai_classification ?? null,
    })),
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: t.type,
      status: t.status,
    })),
  });

  // Race-condition guard: filter clusters die naar verdwenen topics wijzen
  const validTopicIds = new Set(topics.map((t) => t.id));
  const clusters = result.clusters.filter(
    (c) => c.kind === "new" || validTopicIds.has(c.match_topic_id),
  );

  return { clusters };
}
```

### 5. Accept-actions (hergebruik bestaand)

In dezelfde file `apps/devhub/src/actions/bulk-cluster-cleanup.ts` (of split in eigen bestand als >150 regels):

```typescript
import { linkIssueAction } from "@/features/topics/actions/linking";
import { createTopicAction } from "@/features/topics/actions/topics";

export async function acceptClusterToExistingAction(input: {
  topicId: string;
  issueIds: string[];
}) {
  // Auth + access checks (zelfde patroon als hierboven)
  // Sequential aanroep van linkIssueAction per issue
  // Returnt { success: true, linked: N } of { error }
}

export async function acceptClusterAsNewAction(input: {
  projectId: string;
  topicPayload: { title: string; description: string; type: "bug" | "feature" };
  issueIds: string[];
}) {
  // 1. createTopicAction(topicPayload) → newTopicId
  // 2. Loop linkIssueAction({ topicId: newTopicId, issueId }) per issue
  // 3. Returnt { success: true, topicId: newTopicId, linked: N } of { error }
}
```

**Belangrijk** (CLAUDE.md "Database & Queries"): geen directe `.from()` of duplicate validatie. De bestaande actions doen al hun eigen Zod + `revalidatePath`.

### 6. UI — cluster-suggestions panel

Folder (compositie, zie design decision 1): `apps/devhub/src/components/cluster-suggestions/cluster-suggestions-panel.tsx`.

```typescript
"use client";

// Props: projectId, hasUngroupedIssues
// State: clusters | null, loading, error
// Render:
//   - Knop "Suggesties ophalen" als clusters===null
//   - Lijst van <ClusterSuggestionCard> als clusters!==null
//   - Knop "Regenereer" + "Sluit panel"
```

`apps/devhub/src/components/cluster-suggestions/cluster-suggestion-card.tsx`:

- Props: `cluster`, `topics` (lookup voor match-titel), `projectId`
- Toont: target (TopicPill bij match, "Nieuw topic" badge bij new) + rationale + issue-chips (klik = open issue-detail in nieuwe tab) + 2 knoppen
- Knop "Accepteer" → roept de juiste accept-action aan, op success: card disappears (`useTransition` + lokaal filteren)
- Knop "Negeer" → puur lokaal: filter cluster uit state (geen DB-write, conform PR-RULE-101)

### 7. Page-integratie

`apps/devhub/src/app/(app)/issues/page.tsx`:

- Render `<ClusterSuggestionsPanel>` boven `<IssueList>`, **alleen** als `params.ungrouped === true` en er ungrouped open issues zijn (al berekend uit `filterParams`).
- Geen verdere wijzigingen aan de bestaande filter-logica.

### 8. Default-filter side-fix

In `apps/devhub/src/features/issues/components/issue-filters.tsx` óf in `apps/devhub/src/app/(app)/issues/page.tsx` (afhankelijk van waar de defaults zitten — verifieer):

- Wanneer `ungroupedOnly === true` en de user géén expliciete `status`-filter heeft gezet, default naar `status NOT IN ('done','cancelled')` (concreet: `['triage','backlog','todo','in_progress']`).
- User kan via expliciete status-filter wel done/cancelled toevoegen.
- Validatie: ungrouped-view toont nu standaard alleen open werk; closed leeft alleen onder expliciete filter.

### 9. Tests

- **Vitest unit (`packages/ai/__tests__/agents/bulk-cluster-cleanup.test.ts`)**: mock `generateObject`-response (de boundary, conform CLAUDE.md anti-laundering), verifieer dat de agent input correct samenstelt en de Zod-validatie op output werkt.
- **Vitest action (`apps/devhub/__tests__/actions/bulk-cleanup.test.ts`)**:
  - Mock `runBulkClusterCleanup` → return fixture met 1 match-cluster + 1 new-cluster
  - Verifieer dat `acceptClusterToExistingAction` exact N×`linkIssueAction`-payloads produceert (capture-mock op de DB-grens)
  - Verifieer dat `acceptClusterAsNewAction` eerst 1× create + N× link genereert
  - Negative path: project zonder ungrouped issues → `{ clusters: [] }`
  - Negative path: forbidden user → `{ error: 'forbidden' }`
- **Geen e2e in deze sprint** (geen Playwright in repo); manueel happy path op staging:
  - BnB Keurmerk #6+#7 als cluster voorgesteld → match aan bestaand topic "Wit scherm" → accepteer → topics-page toont 2 nieuwe linked issues onder "Wit scherm".

## Acceptatiecriteria

- [ ] **PR-AI-100**: agent geregistreerd, zichtbaar in `/agents` observability-pagina
- [ ] **PR-AI-101 t/m PR-AI-106**: agent runt, Zod-output valideert, `ai_classification` zit in input, geen embeddings/pgvector
- [ ] **PR-REQ-200..203**: `runBulkClusterCleanupAction` werkt met auth + access-checks; lege return bij projecten zonder ungrouped open issues
- [ ] **PR-REQ-204..206**: accept-flows hergebruiken bestaande `linkIssueAction` + `createTopicAction` één-op-één (geen duplicate Zod, geen duplicate `revalidatePath`)
- [ ] **PR-REQ-207..209**: panel + cards verschijnen alleen op `?ungrouped=true`, knop "Regenereer" werkt, klik op issue-titel opent issue-detail
- [ ] **PR-REQ-210**: default-filter op ungrouped-view sluit done/cancelled uit, expliciete status-filter overschrijft dit
- [ ] **PR-RULE-100/101/102**: geen auto-link, geen persistentie van suggesties, één project per call
- [ ] **PR-SEC-100**: cross-project access geblokkeerd (test met andere member)
- [ ] **Zero schema-changes** (geen nieuwe tabellen, geen kolommen op `issues`, geen migraties)
- [ ] **Token-budget**: één run op Cai Studio (67 issues + ~10 topics) past in Haiku-context (verifieer met echte run; clip descriptions naar 400 chars)
- [ ] **Type-check + lint + `npm run check:queries` slagen**
- [ ] **Vitest-suite** voor agent + action groen (mocks alleen op de boundary: `@ai-sdk/anthropic`/`ai`, Supabase admin client)
- [ ] **Manuele e2e**: BnB Keurmerk #6 en #7 worden voorgesteld als cluster → match aan bestaand topic "Wit scherm" → accepteer → linked-issues panel op topic-detail toont ze

## Risico's

| Risico                                                                  | Mitigatie                                                                                                                        |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Haiku produceert clusters die met meerdere topics overlappen            | Schema dwingt 1 issue → 1 cluster (geen overlap mogelijk via `discriminatedUnion`); prompt-regel expliciet                       |
| Description-truncatie verliest cruciale context                         | 400 chars is een arbitraire knip; monitoring na eerste runs. Verleng naar 800 als signaal-loss optreedt                          |
| Race-condition: topic verdwijnt tussen call en accept                   | Action filtert verdwenen topics uit return; bij accept faalt `linkIssueAction` netjes met "topic not found"                      |
| User verwart bulk-tool met PR-014 curator                               | UI-label "Cluster-suggesties (Haiku, batch)" + tooltip; PR-014 krijgt later "(at-intake)" suffix                                 |
| Token-cost per call groeit als project >150 ungrouped issues krijgt     | Action heeft `limit: 200` op `listIssues`. Bij meer: paged-call (out-of-scope, voeg toe als incident optreedt)                   |
| Default-filter-aanpassing breekt bestaande deeplinks naar `?ungrouped=` | Side-fix is conservatief: alleen status-default, geen URL-shape-change; bestaande deeplinks met expliciete status blijven werken |
| Niet-persistente suggesties gaan verloren bij refresh tijdens review    | Bewuste keuze (PR-RULE-101). Banner: "Suggesties zijn niet opgeslagen — accepteer of regenereer voordat je weggaat"              |

## Bronverwijzingen

- Vision: [`docs/specs/vision-ai-native-architecture.md`](../../docs/specs/vision-ai-native-architecture.md) §2.4 (AI als account manager) + verification-first
- DevHub requirements: [`docs/specs/requirements-devhub.md`](../../docs/specs/requirements-devhub.md)
- CLAUDE.md model-tier-policy ("Haiku for simple tasks") en queries-discipline (geen directe `.from()` in actions)
- PRD-portal-roadmap: [`docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md`](../../docs/specs/prd-portal-roadmap/10-fase-5-ai-acceleratie.md) §10.3.1 voor de sister-agent (PR-014)
- Bestaand: [`apps/devhub/src/features/topics/README.md`](../../apps/devhub/src/features/topics/README.md) (topics als bron-UI voor portal-roadmap)
- Bestaand: [`packages/ai/src/agents/registry.ts`](../../packages/ai/src/agents/registry.ts)
- Bestaand: [`apps/devhub/src/features/topics/actions/topics.ts`](../../apps/devhub/src/features/topics/actions/topics.ts) (`createTopicAction`)
- Bestaand: [`apps/devhub/src/features/topics/actions/linking.ts`](../../apps/devhub/src/features/topics/actions/linking.ts) (`linkIssueAction`)
- Bestaand: [`packages/database/src/queries/issues/core.ts`](../../packages/database/src/queries/issues/core.ts) (`listIssues`, `ungroupedOnly` filter)
- Bestaand: [`apps/devhub/src/app/(app)/issues/page.tsx`](<../../apps/devhub/src/app/(app)/issues/page.tsx>) (integratie-punt)
- Sister-sprint: [`sprints/backlog/PR-014-topic-curator-agent.md`](./PR-014-topic-curator-agent.md) (per-issue at-intake variant — blijft bestaan naast deze sprint)
- Sister-sprint: [`sprints/backlog/PR-018-agent-suggestions-table-and-acceptance-tracking.md`](./PR-018-agent-suggestions-table-and-acceptance-tracking.md) (NIET dependency van PR-019; suggesties hier zijn niet-persistent)

## Vision-alignment

Past binnen vision §2.4 ("AI als account manager") en het kern-principe "verification before truth": Haiku stelt voor, mens accepteert per cluster, geen auto-link. Hergebruik van bestaande mutation-laag is consistent met "database als communication bus" (CLAUDE.md): elke accept loopt door dezelfde `linkIssueAction` en triggert dezelfde events/revalidates als handmatige curatie. Niet-persistente suggesties zijn de bewuste trade-off voor een opruim-tool — wat geen mens accepteert, hoort niet in de waarheids-tabel terecht te komen.
