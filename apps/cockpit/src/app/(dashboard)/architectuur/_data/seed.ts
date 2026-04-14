export const seedSection = {
  simpleExplanation:
    "Het systeem is voorgeladen met jullie echte organisaties, teamleden en projecten. Teamleden hebben een @jouwaipartner.nl email zodat de pipeline ze automatisch als intern herkent. Externe contacten zijn gekoppeld aan hun organisatie voor automatische party_type classificatie.",
  data: [
    {
      category: "Organisaties",
      items: ["Jouw AI Partner (eigen)", "Ordus (klant)", "Effect op maat (klant)"],
    },
    {
      category: "Team (intern)",
      items: [
        "Stef Banninga (leadership, stef@jouwaipartner.nl)",
        "Wouter van den Heuvel (leadership, wouter@jouwaipartner.nl)",
        "Ege (engineering, ege@jouwaipartner.nl)",
        "Kenji (engineering, kenji@jouwaipartner.nl)",
        "Myrrh (engineering, myrrh@jouwaipartner.nl)",
        "Tibor (partner, geen team)",
      ],
    },
    {
      category: "Externe contacten",
      items: ["Bart Nelissen (Ordus, klant)", "Fleur Timmerman (Effect op maat, klant)"],
    },
    { category: "Projecten", items: ["Ordus", "Fleur op zak", "HelperU"] },
    {
      category: "Interne domeinen",
      items: ["@jouwaipartner.nl en @jaip.nl worden altijd als intern herkend"],
    },
  ],
};
