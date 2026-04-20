# Refactor Ideas

Ideas-folder voor grote refactors die **nog niet** in planning zijn. Hier staan sprints die:

- Reëel werk zijn (niet één middag)
- Speculatief zijn — optimaliseren voor een scenario dat er nog niet is
- Een duidelijke **trigger** hebben die bepaalt wanneer ze wél ingepland moeten worden

Deze folder is **geen backlog**. Niets hier wordt opgepakt tenzij de trigger geraakt wordt.

## Wanneer verplaats je iets van hier naar `sprints/backlog/`?

1. De trigger in de header van het bestand is geraakt
2. Je hebt de spec opnieuw gelezen en geverifieerd dat hij nog klopt
3. Je bent bereid het werk te doen — niet "misschien ooit" maar "ik ga hier nu aan beginnen"

## Huidige ideas

| ID       | Onderwerp                                  | Trigger                                                    |
| -------- | ------------------------------------------ | ---------------------------------------------------------- |
| COMM-001 | Communications supertype + dual-write      | 3e kanaal toegevoegd OF portal GA + aantoonbare drift-pijn |
| COMM-002 | Queries, pipeline + RLS op communications  | Na COMM-001                                                |
| COMM-003 | UI consolideren + oude kolommen deprecaten | Na COMM-001 + COMM-002                                     |

## Niet hier?

- **Quick fixes en features** → `sprints/backlog/`
- **Afgeronde sprints** → `sprints/done/`
- **Architectuur-visie (niet uitvoerbaar)** → `docs/specs/`
- **Oude/obsolete specs** → `docs/archive/`
