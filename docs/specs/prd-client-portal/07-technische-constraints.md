# 7. Technische Constraints

## Tech Stack

| Component      | Technologie                                     | Toelichting                                         |
| -------------- | ----------------------------------------------- | --------------------------------------------------- |
| Frontend       | Next.js (App Router)                            | Nieuwe app in bestaande monorepo                    |
| UI             | Tailwind CSS + shadcn/ui                        | Consistent met Cockpit                              |
| State          | React Server Components + minimale client state | Geen Redux/Zustand nodig                            |
| Backend        | Supabase (gedeeld met DevHub + Cockpit)         | Geen aparte API laag                                |
| Auth           | Supabase Auth (magic link)                      | OTP via email                                       |
| Database       | PostgreSQL (via Supabase)                       | Bestaand schema uitbreiden                          |
| Hosting        | Vercel                                          | Nieuwe Vercel-project of preview-deploy in monorepo |
| Email-provider | Supabase default of Resend                      | TBD — Resend bij hoger volume                       |

## Constraints

- **Performance**: Dashboard laadt < 1.5s op desktop en < 2.5s op 4G
- **Browser support**: Laatste 2 versies van Chrome, Firefox, Safari, Edge
- **Responsive**: Mobile-first, breakpoints sm (640) / md (768) / lg (1024)
- **Taal**: Nederlands (i18n niet nodig in v1, wel architecturaal voorbereiden)
- **Accessibility**: Basis WCAG 2.1 AA — keyboard-navigatie, focus-states, contrast
- **Branding**: JAIP huisstijl (TBD — alignen met Cockpit), niet FlowWijs

## Externe afhankelijkheden

- **Supabase**: bestaande project, geen nieuwe dependency
- **Email-delivery**: standaard Supabase mailer in v1 voor magic links; switchen naar Resend als volume groeit (>100 mails/dag)

## Monorepo-overwegingen

- Nieuwe app `apps/portal` (of bestaande locatie als al opgezet — checken)
- Hergebruik van shared packages: `packages/db` (Supabase client + types), `packages/ui` (shadcn-componenten), `packages/auth`
- Geen breaking changes aan DevHub of Cockpit
- Aparte Vercel-deploy zodat klanten niet `cockpit.jouwaipartner.nl` zien staan
