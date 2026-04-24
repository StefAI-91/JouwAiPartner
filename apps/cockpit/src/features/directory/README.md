# Feature: Directory

CRM-domein: organisaties (klanten, adviseurs, intern, partners, leveranciers) en personen (contacten binnen die organisaties). Eén feature, drie publieke ingangen: `/directory`, `/people`, `/clients` + `/administratie` voor niet-commerciële organisaties.

## Menu per laag

### `actions/`

Server actions voor CRUD op organisaties en personen.

| File               | Exports                                                                            | Gebruikt door                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `organizations.ts` | `createOrganizationAction`, `updateOrganizationAction`, `deleteOrganizationAction` | `add-organization-button`, `edit-organization`, `features/meetings/components/create-organization-modal`                                   |
| `people.ts`        | `createPersonAction`, `updatePersonAction`, `deletePersonAction`                   | `add-person-button`, `edit-person`, `features/meetings/components/create-person-sub-modal`, `features/meetings/components/people-selector` |

### `components/`

UI voor directory-overzicht, detail- en edit-flows. Geen barrel.

| File                          | Rol                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| `directory-tabs.tsx`          | Tabs op `/directory` die orgs en people-grids schakelen.                                           |
| `organizations-grid.tsx`      | Grid-weergave van organisaties (in directory-tabs).                                                |
| `people-grid.tsx`             | Grid-weergave van personen (in directory-tabs).                                                    |
| `add-organization-button.tsx` | Knop + modal om organisatie toe te voegen. Gebruikt op `/clients`, `/administratie`, `/directory`. |
| `edit-organization.tsx`       | Modal om organisatie te bewerken. Gebruikt op `/clients/[id]`, `/administratie/[id]`.              |
| `org-summary.tsx`             | AI context-samenvatting van een organisatie (detail-pagina).                                       |
| `org-briefing.tsx`            | AI briefing-sectie op detail-pagina.                                                               |
| `org-timeline.tsx`            | Chronologische tijdlijn uit AI-briefing.                                                           |
| `add-person-button.tsx`       | Knop + modal om persoon toe te voegen. Gebruikt op `/people`, `/directory`.                        |
| `edit-person.tsx`             | Modal om persoon te bewerken. Gebruikt op `/people/[id]`.                                          |

## Gerelateerde packages (NIET in deze feature)

| Pad                                      | Rol                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `@repo/database/queries/organizations`   | `listOrganizations`, `getOrganizationById`, `listOrganizationsByType`.                                     |
| `@repo/database/queries/people`          | `listPeople`, `getPersonById`, `listPeopleWithOrg`, `listPeopleByOrganization`, `listPeopleForAssignment`. |
| `@repo/database/mutations/organizations` | `createOrganization`, `updateOrganization`, `deleteOrganization`.                                          |
| `@repo/database/mutations/people`        | `createPerson`, `updatePerson`, `deletePerson`.                                                            |
| `@repo/database/validations/entities`    | `updateOrganizationSchema`, `updatePersonSchema`, `deleteSchema`.                                          |
| `@repo/database/validations/meetings`    | `createOrganizationSchema`, `createPersonSchema`.                                                          |
| `@repo/database/constants/organizations` | `ORG_TYPES`, `ORG_STATUSES`.                                                                               |
| `@repo/ai/validations/project-summary`   | `extractOrgTimeline` (timeline uit AI-briefing op detail-pagina's).                                        |

## Design decisions

- **Eén feature, niet drie.** `clients`, `people`, `organizations`, `directory` waren voorheen vier aparte mappen met overlappende components. Ze zijn samengevoegd omdat de onderliggende entities (organizations + people) identiek zijn — alleen de view verschilt per URL.
- **Team-actions horen NIET bij directory.** De `team` action-laag gaat over user-invites en access control voor het intern team (met login, `auth.users`), niet over CRM-entities. Dat blijft een aparte horizontale laag in `@/actions/`.
- **Administratie-componenten blijven horizontaal.** Deze zijn page-specifieke UI voor de `/administratie` route, geen herbruikbare directory-components. Composition pages zijn geen features.
- **`cleanInput`** komt uit `@/actions/_utils` — shared helper, blijft horizontaal.
- **Shared via 3 pages.** `AddOrganizationButton`, `EditOrganization`, `OrgSummary/Briefing/Timeline` worden door zowel `/clients` als `/administratie` (en deels `/directory`) gebruikt. Ze wonen hier als canonical source.
