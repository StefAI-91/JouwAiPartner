-- TH-001 — Seed: 10 verified themes uit PRD §11.3-11.4
-- Idempotent: ON CONFLICT (slug) DO UPDATE zodat re-runs veilig zijn.
-- Run via: supabase db execute --file supabase/seed/themes.sql

INSERT INTO themes (id, slug, name, emoji, description, matching_guide, status, created_by_agent, verified_at)
VALUES
    (
        'd0000000-0000-0000-0000-000000000001',
        'ai-native-strategie-positionering',
        'AI-native strategie & positionering',
        '🧭',
        'JAIP''s eigen verhaal als langetermijn-transformatiepartner (niet bureau, niet SaaS).',
        'Valt onder dit thema als het gaat over JAIP''s eigen verhaal naar buiten: wat we zijn (partner, niet bureau), voor wie (MKB in transitie), hoe we ons onderscheiden, en het grotere narratief ''je bedrijf is over 5 jaar niet meer hetzelfde''. Valt er niet onder als het gaat over hoe we intern onze tools bouwen (→ Interne platform & kennisbank) of over hoe we een specifieke klant transformeren (→ Klant AI-transformatie trajecten).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        'interne-platform-kennisbank',
        'Interne platform & kennisbank',
        '🤖',
        'JAIP''s eigen AI-native stack: kennisbank, DevHub, MCP-server, transcriptie-pipeline.',
        'Valt onder dit thema als het gaat over de kennisbank, de DevHub, Gatekeeper AI, ElevenLabs/Fireflies transcriptie-keuzes, de MCP-server, of de reviewflow van extractions. Valt er niet onder als het gaat over een vergelijkbaar platform dat we bij een klant bouwen (→ Klant AI-transformatie trajecten) of over de strategische positionering erachter (→ AI-native strategie & positionering).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'discovery-mvp-kickoffs',
        'Discovery & MVP-kickoffs',
        '🙋',
        'Eerste gesprekken: behoeftes uitvragen, scope afbakenen, wel/niet instappen.',
        'Valt onder dit thema als het gaat over kennismakingscalls, discovery-sessies, scope bepalen, go/no-go met een nieuwe klant, of het afwegen of iemand ''past''. Valt er niet onder als de klant al in productie zit (→ Klantcommunicatie & verwachtingen) of als het over lopende MVP-development gaat (→ project-specifiek).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'werkdruk-founder-capaciteit',
        'Werkdruk & founder-capaciteit',
        '🫂',
        'Stef''s overbelasting, overnemen Wouter''s rol tijdens verlof, capaciteit op founder-niveau.',
        'Valt onder dit thema als het gaat over persoonlijke werkdruk, slaap, stress, verantwoordelijkheidsgevoel van Stef/Wouter, rolverdeling tussen founders, of Wouters vaderschapsverlof dat Stef''s bord raakt. Valt er niet onder als de druk komt door een te klein team op developer-niveau (→ Team capaciteit & hiring) of door financiële druk van een klant (→ project-context).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000005',
        'founder-ritme-samenwerking',
        'Founder-ritme & samenwerking',
        '🗣️',
        'Wekelijkse sync, 1-op-1''s, rolverdeling Stef (tech-ops) vs Wouter (commercieel-strategisch).',
        'Valt onder dit thema als het gaat over de 1-op-1 tussen Stef en Wouter, daily standups, strategische sync, of hoe zij elkaar aanvullen. Valt er niet onder als het gaat over persoonlijke werkdruk zonder samenwerkings-aspect (→ Werkdruk & founder-capaciteit) of over teammeetings met de bredere JAIP-crew (→ Team capaciteit & hiring).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000006',
        'klant-ai-transformatie-trajecten',
        'Klant AI-transformatie trajecten',
        '🚀',
        'Klanten die hun héle bedrijf AI-native willen maken — operatiemodel, niet één feature.',
        'Valt onder dit thema als de klant zelf ambieert ''AI-native te worden'', het hele bedrijf te transformeren, of een microservices-per-bedrijfsonderdeel aanpak kiest (Yasemin, Adstra, Brik, SureSync, Looping). Valt er niet onder als het een afgebakende MVP of feature is (→ Discovery & MVP-kickoffs), of over onze eigen positionering (→ AI-native strategie & positionering).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000007',
        'stabiliteit-vs-feature-snelheid',
        'Stabiliteit vs. feature-snelheid',
        '🧱',
        'Terugkerende spanning tussen klantdruk om door te bouwen en technische schuld die zich opstapelt.',
        'Valt onder dit thema als het gaat over refactoring uitstellen, technical debt, platform-crashes, bugfix-prioriteit vs. nieuwe features, of de les ''te snel doorgebouwd zonder fundament''. Valt er niet onder als het specifiek over één klant-incident gaat (→ project-context), of over development-proces en PRD''s (→ werkwijze-thema wat later emerging kan worden). Dit thema gaat over de afweging zelf.',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000008',
        'klantcommunicatie-verwachtingen',
        'Klantcommunicatie & verwachtingen',
        '💬',
        'Hoe JAIP voortgang, bugs en tegenslagen communiceert en wat er misgaat als dat niet loopt.',
        'Valt onder dit thema als het gaat over weekly updates, Slack-kanalen met klanten, ticketsystemen, verkeerde product-lanceringen, roadmap-verschuivingen die gecommuniceerd moeten worden, of klanten die ''te hard pushen'' in Slack. Valt er niet onder als het gaat over de inhoud van de roadmap zelf (→ project-specifiek) of over interne JAIP-communicatie (→ Founder-ritme of Team capaciteit).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-000000000009',
        'partners-sparring-netwerk',
        'Partners & sparring-netwerk',
        '🤝',
        'Externe adviseurs (Arjen, Dion, Tibor, Joep) en hoe hun rol in JAIP''s ecosysteem wordt vormgegeven.',
        'Valt onder dit thema als het gaat over de rol van Tibor (sales/netwerk), Arjen (advies), Dion (mentor/sparringpartner), Joep (CAI-samenwerking) of ADSTRA-partnerschap vormgeving. Valt er niet onder als het puur over een klantproject met die persoon gaat (→ project), of over hiring van interne medewerkers (→ Team capaciteit & hiring).',
        'verified',
        NULL,
        now()
    ),
    (
        'd0000000-0000-0000-0000-00000000000a',
        'team-capaciteit-hiring',
        'Team capaciteit & hiring',
        '👥',
        'Behoefte aan senior developer, rolverdeling Ege/Kenji/Myrrh, dedicated developers per klant.',
        'Valt onder dit thema als het gaat over openstaande vacatures, senior developer tekort, rolverdeling Ege/Kenji/Myrrh, dedicated developers per klant, of team-upskilling. Valt er niet onder als het specifiek over Stef''s persoonlijke werkdruk gaat (→ Werkdruk & founder-capaciteit) of over klant-team capaciteit (→ project-context).',
        'verified',
        NULL,
        now()
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    emoji = EXCLUDED.emoji,
    description = EXCLUDED.description,
    matching_guide = EXCLUDED.matching_guide,
    status = EXCLUDED.status,
    verified_at = COALESCE(themes.verified_at, EXCLUDED.verified_at),
    updated_at = now();
