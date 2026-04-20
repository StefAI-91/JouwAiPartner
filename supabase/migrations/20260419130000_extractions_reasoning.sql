-- Voeg reasoning-kolom toe aan extractions.
--
-- Korte Nederlandse toelichting (1-3 zinnen) waarin de extractor-agent
-- uitlegt waarom dit item gekozen is als risk/action_item/etc., welke
-- confidence-indicatoren meespeelden en welk alternatief overwogen is.
--
-- Nullable zodat oude records niet gebackfilled hoeven te worden en een
-- toekomstige agent die geen reasoning levert niet faalt. Aparte kolom
-- i.p.v. metadata-JSON: (a) consumer-pad leest dit rechtstreeks voor
-- calibratie/debug, niet als extra metadata; (b) voorkomt bloat van de
-- metadata-JSONB-index.
--
-- NOT in search_vector — reasoning is meta-commentaar over de extractie,
-- geen inhoud waarop je wilt zoeken. Search blijft op content + transcript_ref.

ALTER TABLE extractions
  ADD COLUMN IF NOT EXISTS reasoning text;

COMMENT ON COLUMN extractions.reasoning IS
  'Nederlandse uitleg (1-3 zinnen) van de extractor: waarom dit type, welke '
  'confidence-indicatoren, welke alternatieven overwogen. Bedoeld voor '
  'calibratie, debugging en latere downstream (evaluatie, agentische uitbreidingen). '
  'NULL voor legacy rijen van vóór deze migratie.';
