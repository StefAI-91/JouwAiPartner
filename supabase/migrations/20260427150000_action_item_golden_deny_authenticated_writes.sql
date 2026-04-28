-- Defense-in-depth voor de golden-tabellen.
--
-- Originele migratie 20260425110000 zette RLS aan en definieerde alleen
-- SELECT-policies. Default-deny blokkeert al INSERT/UPDATE/DELETE voor
-- authenticated zonder matching permissive policy, en service-role bypasst
-- RLS sowieso. Maar dat is impliciet: een toekomstige permissive `FOR ALL`-
-- policy zou writes silently openzetten.
--
-- Daarom hier RESTRICTIVE policies die de write-deny vastleggen. Restrictive
-- wordt AND'd met permissive — dus zelfs als iemand later een permissive
-- INSERT/UPDATE/DELETE-policy toevoegt, blokkeren deze. Service-role blijft
-- RLS bypassen; alle writes lopen via de admin client in server actions.

CREATE POLICY action_item_golden_meetings_deny_authenticated_insert
  ON action_item_golden_meetings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY action_item_golden_meetings_deny_authenticated_update
  ON action_item_golden_meetings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY action_item_golden_meetings_deny_authenticated_delete
  ON action_item_golden_meetings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY action_item_golden_items_deny_authenticated_insert
  ON action_item_golden_items
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY action_item_golden_items_deny_authenticated_update
  ON action_item_golden_items
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY action_item_golden_items_deny_authenticated_delete
  ON action_item_golden_items
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);
