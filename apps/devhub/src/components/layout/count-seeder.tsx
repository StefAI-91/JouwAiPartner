"use client";

import { useEffect } from "react";
import { issueCountStore, type StatusCounts } from "./issue-count-store";

/**
 * Seeds the client-side count store with server-rendered counts so the
 * sidebar badges are correct on first paint after navigating to a page
 * that already queries counts for its own purposes. Renders nothing.
 */
export function CountSeeder({ projectId, counts }: { projectId: string; counts: StatusCounts }) {
  useEffect(() => {
    issueCountStore.set(projectId, counts);
    // We intentionally re-seed whenever the server-rendered snapshot
    // changes (e.g. after revalidatePath). Stringify to keep the dep
    // stable while catching real changes.
  }, [projectId, JSON.stringify(counts)]);

  return null;
}
