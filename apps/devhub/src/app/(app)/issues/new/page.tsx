import { listPeople } from "@repo/database/queries/people";
import { createClient } from "@repo/database/supabase/server";
import { IssueForm } from "@/components/issues/issue-form";

export default async function NewIssuePage() {
  const supabase = await createClient();
  const people = await listPeople(supabase, { limit: 200 });

  return <IssueForm people={people.map((p) => ({ id: p.id, name: p.name }))} />;
}
