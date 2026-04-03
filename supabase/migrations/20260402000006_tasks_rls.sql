-- Enable RLS on tasks table with permissive policies for authenticated users.
-- Same pattern as other tables (fine-grained policies deferred to v3).

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all tasks"
  ON tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage tasks"
  ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
