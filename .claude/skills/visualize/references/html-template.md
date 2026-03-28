# HTML Template

Gebruik dit als basis voor elke visualisatie. Pas de title, kleuren en content aan per project.

## Standaard template

```html
<!DOCTYPE html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[Type]: [Beschrijving]</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              primary: {
                50: "#f0fdf4",
                100: "#dcfce7",
                200: "#bbf7d0",
                300: "#86efac",
                400: "#4ade80",
                500: "#006B3F",
                600: "#005a35",
                700: "#004a2b",
                800: "#003d23",
                900: "#00301b",
              },
            },
          },
        },
      };
    </script>
    <style>
      body::before {
        content: "📐 SCHETS — niet definitief";
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #fef3c7;
        color: #92400e;
        text-align: center;
        padding: 4px;
        font-size: 12px;
        font-weight: 600;
        z-index: 9999;
      }
      body {
        padding-top: 28px;
      }
    </style>
  </head>
  <body class="bg-gray-50 text-gray-900">
    <!-- Content hier -->

    <script>
      // Interactieve logica hier (tabs, modals, toggles)
    </script>
  </body>
</html>
```

## Aanpasbare onderdelen

### Project kleuren

Als het project een eigen kleur heeft (uit CLAUDE.md, projectinfo, of eerder in de conversatie genoemd), vervang dan de `primary` kleurenschaal. Genereer een volledige schaal van 50-900 op basis van de hoofdkleur.

Als er geen projectkleur bekend is, gebruik de Flowwijs standaard: `#006B3F` (groen).

### Schets-indicator

De gele balk bovenaan is verplicht bij elke schets. Dit voorkomt verwarring bij stakeholders over of iets een definitief ontwerp is.

Bij een **styled mockup** mag de tekst aangepast worden naar: `🎨 MOCKUP — ter validatie`.

### Snelle schets vs Styled mockup

**Snelle schets (lo-fi):**

- Gebruik alleen grijstinten: `gray-50` t/m `gray-900`
- Geen afgeronde hoeken of schaduwen
- Simpele borders in plaats van kaarten
- Systeemfont, geen custom typografie
- Focus op structuur en layout, niet op esthetiek

**Styled mockup:**

- Gebruik de primary kleurenschaal
- Afgeronde hoeken (`rounded-lg`), schaduwen (`shadow-sm`)
- Kaart-gebaseerde layout waar relevant
- Hover states en transitions (`transition-colors duration-150`)
- Iconen waar nuttig (gebruik unicode emoji's of eenvoudige SVG inline)

## Technische richtlijnen

- **Geen externe dependencies** behalve Tailwind CDN
- **Geen React, geen build stap** — puur HTML + Tailwind + vanilla JS
- **Interactiviteit in vanilla JS** — tabs, modals, toggles, hover states
- **Responsive als relevant** — gebruik Tailwind breakpoints als de gebruiker mobile noemt
- **Annotaties in HTML comments** — `<!-- COMPONENT: LeadsTable -->` zodat duidelijk is welke componenten je bedoelt
- **Realistische viewport** — geen 4000px brede pagina's tenzij gevraagd
