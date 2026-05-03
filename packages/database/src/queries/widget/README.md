# queries/widget/

Read-helpers voor het embedded feedback-widget. Twee scopes: runtime
origin-validatie (publieke ingest-endpoint) en de DevHub-admin-UI.

Externe consumers importeren `from "@repo/database/queries/widget"`.

## Files

| File        | Rol                                                                                    | Hoofdexports                                                |
| ----------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `index.ts`  | Publieke barrel.                                                                       | —                                                           |
| `access.ts` | Origin-whitelist checks voor `/api/ingest/widget` — domain lookup + origin validation. | `getAllowedDomainsForProject`, `isOriginAllowedForProject`  |
| `admin.ts`  | DevHub admin-UI op `/settings/widget` — projects + bijbehorende whitelist-domains.     | `listWidgetProjectsWithDomains`, `WidgetProjectWithDomains` |

## Design decisions

- **Default client = admin (service-role).** De ingest-route is stateless en draait zonder user-session; de admin-UI loopt al door een `isAdmin`-guard. Service-role spaart een auth-roundtrip.
- **`isOriginAllowedForProject` parseert de Origin header zelf.** Lege of misvormde Origins → `false` (defensief), geen exception. Hiermee crasht de ingest-route niet op browser-bugs.
- **Single join in `listWidgetProjectsWithDomains`.** Voorkomt N+1 over projecten; admin-pagina is sowieso niet hot-path.
