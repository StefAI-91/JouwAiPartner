# 7. Technische Constraints

## Tech Stack

| Component       | Technologie                                                  | Toelichting                                                          |
| --------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Frontend        | Next.js 16 (App Router) + React 19                           | Bestaande app `apps/portal`                                          |
| UI              | Tailwind v4 (CSS-first, geen config) + shadcn/ui (base-nova) | Consistent met Cockpit/DevHub                                        |
| State           | React Server Components + minimale client state              | Geen Redux/Zustand                                                   |
| Backend         | Supabase (gedeeld met DevHub + Cockpit)                      | Geen aparte API laag                                                 |
| Auth            | Supabase Auth (email-OTP, `signInWithOtp`)                   | `shouldCreateUser: false` voorkomt enumeratie                        |
| Database        | PostgreSQL (via Supabase)                                    | Bestaand schema uitbreiden                                           |
| Hosting         | Vercel                                                       | Eigen project per app (zoals DevHub/Cockpit hun eigen `vercel.json`) |
| Email-provider  | Supabase default                                             | Resend overwegen bij volume > 100 mails/dag                          |
| Shared packages | `@repo/database`, `@repo/auth`, `@repo/ui`                   | Hergebruik; geen breaking changes                                    |

## Routes (bestaand + nieuw)

| Route                             | Pagina                                          | Auth                    | Status                              |
| --------------------------------- | ----------------------------------------------- | ----------------------- | ----------------------------------- |
| `/login`                          | Email-OTP login                                 | Public                  | Bestaand                            |
| `/auth/callback`                  | OTP-callback handler                            | Public                  | Bestaand                            |
| `/`                               | Project-overzicht (redirect bij 1 project)      | Client                  | Bestaand                            |
| `/projects/[id]`                  | Project-dashboard                               | Client + project access | Bestaand                            |
| `/projects/[id]/issues`           | Issue-lijst — uit te breiden naar 4-bucket view | Client + project access | Aanpassen                           |
| `/projects/[id]/issues/[issueId]` | Issue-detail — uit te breiden met fallbacks     | Client + project access | Aanpassen                           |
| `/projects/[id]/feedback`         | Feedback-formulier                              | Client + project access | v2 (uitgesteld uit `portal-mvp.md`) |

## Constraints

- **Performance**: Dashboard laadt < 1.5s op desktop en < 2.5s op 4G
- **Browser support**: Laatste 2 versies van Chrome, Firefox, Safari, Edge
- **Responsive**: Mobile-first, breakpoints sm (640) / md (768) / lg (1024)
- **Taal**: Nederlands (geen i18n-skeleton in v1; pas implementeren wanneer multi-taal nodig is)
- **Accessibility**: Basis WCAG 2.1 AA — keyboard-navigatie, focus-states, contrast
- **Branding**: Consistent met Cockpit/DevHub; geen klant-specifieke branding (uitgesteld v2+)

## Externe afhankelijkheden

- **Supabase**: bestaande project, geen nieuwe dependency
- **Email-delivery**: standaard Supabase mailer in v1; switchen naar Resend als volume groeit (>100 mails/dag)

## Monorepo & Deploy

- App-pad: `apps/portal/` (al aanwezig, port 3002 in dev)
- Hergebruik shared packages uit `packages/database`, `packages/auth`, `packages/ui`
- `apps/portal/vercel.json` ontbreekt nog — toevoegen voor deploy-pariteit met Cockpit/DevHub
- Eigen subdomein (TBD: `portal.jouwaipartner.nl` of `klant.jouwaipartner.nl`) — niet `cockpit.*`
- Geen breaking changes aan DevHub of Cockpit
