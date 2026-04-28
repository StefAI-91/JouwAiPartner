-- Type_werk E ("partner-levering" voor Tibor/Dion) wordt opgeheven.
-- Reden: het label gaf het LLM een open deur — zodra het twijfelde koos het
-- type E ("het is partner-werk") en gokte op JAIP-relevantie. Tibor en Dion
-- worden nu als gewone externen behandeld; echte partner-leveringen vallen
-- onder type C (extern levert aan JAIP).
--
-- Idempotent: bestaande E-rijen worden naar C gemigreerd voordat de
-- check-constraint wordt versmald.

UPDATE action_item_golden_items
   SET type_werk = 'C'
 WHERE type_werk = 'E';

ALTER TABLE action_item_golden_items
  DROP CONSTRAINT IF EXISTS action_item_golden_items_type_werk_check;

ALTER TABLE action_item_golden_items
  ADD CONSTRAINT action_item_golden_items_type_werk_check
  CHECK (type_werk IN ('A', 'B', 'C', 'D'));
