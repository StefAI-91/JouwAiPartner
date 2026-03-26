# Sprint 17: MCP Server — Expanded Tools

**Phase:** 2 — Expand Sources & Agents
**Requirements:** REQ-1201, REQ-1202, REQ-1204, REQ-1206, REQ-1207, REQ-1208
**Depends on:** Sprint 08 (MCP server running), Sprint 06 (people/entity tables populated)
**Produces:** Full MCP tool suite: decisions, action items, people search, project status

---

## Task 1: Decision and action item tools

**Create `mcp-server/src/tools/structured.ts`:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerStructuredTools(server: McpServer) {
  server.tool(
    "get_decisions",
    "Get decisions that were made about a topic within a date range. Use this when someone asks 'what did we decide about X?'",
    {
      topic: z.string().optional().describe("Filter by topic (partial match)"),
      date_from: z.string().optional().describe("Start date (ISO format)"),
      date_to: z.string().optional().describe("End date (ISO format)"),
      limit: z.number().optional().default(10),
    },
    async ({ topic, date_from, date_to, limit }) => {
      let query = supabase
        .from("decisions")
        .select("id, decision, context, made_by, date, source_type, source_id")
        .eq("status", "active")
        .order("date", { ascending: false })
        .limit(limit);

      if (topic) query = query.ilike("decision", `%${topic}%`);
      if (date_from) query = query.gte("date", date_from);
      if (date_to) query = query.lte("date", date_to);

      const { data, error } = await query;
      if (error || !data?.length) {
        return { content: [{ type: "text" as const, text: "No decisions found." }] };
      }

      const formatted = data.map((d, i) =>
        `${i + 1}. **${d.decision}**\n   Made by: ${d.made_by || "Unknown"} | Date: ${d.date ? new Date(d.date).toLocaleDateString() : "Unknown"} | Source: ${d.source_type}\n   Context: ${d.context || "N/A"}`
      ).join("\n\n");

      return { content: [{ type: "text" as const, text: `## Decisions\n\n${formatted}` }] };
    }
  );

  server.tool(
    "get_action_items",
    "Get action items/tasks, optionally filtered by assignee or status. Use when someone asks 'what are X's tasks?' or 'what's still open?'",
    {
      assignee: z.string().optional().describe("Filter by person assigned"),
      status: z.enum(["open", "in_progress", "done", "all"]).optional().default("open"),
      limit: z.number().optional().default(20),
    },
    async ({ assignee, status, limit }) => {
      let query = supabase
        .from("action_items")
        .select("id, description, assignee, due_date, status, source_type")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (status !== "all") query = query.eq("status", status);
      if (assignee) query = query.ilike("assignee", `%${assignee}%`);

      const { data, error } = await query;
      if (error || !data?.length) {
        return { content: [{ type: "text" as const, text: "No action items found." }] };
      }

      const formatted = data.map((a, i) =>
        `${i + 1}. [${a.status.toUpperCase()}] ${a.description}\n   Assigned to: ${a.assignee || "Unassigned"} | Due: ${a.due_date || "No date"} | Source: ${a.source_type}`
      ).join("\n\n");

      return { content: [{ type: "text" as const, text: `## Action Items\n\n${formatted}` }] };
    }
  );

  server.tool(
    "get_document",
    "Retrieve a specific document by its ID. Use when you have a document ID from search results and need the full content.",
    {
      doc_id: z.string().describe("UUID of the document"),
    },
    async ({ doc_id }) => {
      const { data } = await supabase
        .from("documents")
        .select("id, title, content, source, category, relevance_score, created_at, metadata")
        .eq("id", doc_id)
        .single();

      if (!data) {
        return { content: [{ type: "text" as const, text: `Document ${doc_id} not found.` }] };
      }

      return {
        content: [{
          type: "text" as const,
          text: `## ${data.title}\n\n**Source:** ${data.source}\n**Categories:** ${data.category?.join(", ")}\n**Created:** ${new Date(data.created_at).toLocaleDateString()}\n\n${data.content}`,
        }],
      };
    }
  );
}
```

---

## Task 2: People search and profile tools

**Create `mcp-server/src/tools/people.ts`:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function registerPeopleTools(server: McpServer) {
  server.tool(
    "find_people",
    "Find people by skill, project involvement, or general semantic search. Use when someone asks 'who knows X?' or 'who worked on Y?'",
    {
      query: z.string().optional().describe("Semantic search query (e.g., 'React Native experience')"),
      skill: z.string().optional().describe("Exact skill to search for"),
      project: z.string().optional().describe("Project name to search for involvement"),
    },
    async ({ query, skill, project }) => {
      const results: any[] = [];

      // Semantic search on people embeddings
      if (query) {
        const embedding = await openai.embeddings.create({
          model: "text-embedding-3-small", input: query, dimensions: 1536,
        });
        const { data } = await supabase.rpc("match_people", {
          query_embedding: embedding.data[0].embedding,
          match_threshold: 0.65,
          match_count: 5,
        });
        if (data) results.push(...data.map((p: any) => ({ ...p, match_type: "semantic" })));
      }

      // Structured skill search
      if (skill) {
        const { data } = await supabase
          .from("people_skills")
          .select("person_id, skill, evidence_count, people(name, team, role)")
          .ilike("skill", `%${skill}%`)
          .order("evidence_count", { ascending: false })
          .limit(5);
        if (data) results.push(...data.map((s: any) => ({
          id: s.person_id, name: s.people?.name, team: s.people?.team,
          skill: s.skill, evidence_count: s.evidence_count, match_type: "skill",
        })));
      }

      // Structured project search
      if (project) {
        const { data } = await supabase
          .from("people_projects")
          .select("person_id, project, role_in_project, people(name, team, role)")
          .ilike("project", `%${project}%`)
          .limit(5);
        if (data) results.push(...data.map((p: any) => ({
          id: p.person_id, name: p.people?.name, team: p.people?.team,
          project: p.project, role_in_project: p.role_in_project, match_type: "project",
        })));
      }

      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: "No matching people found." }] };
      }

      // Deduplicate by person ID
      const seen = new Set<string>();
      const unique = results.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      const formatted = unique.map((p, i) =>
        `${i + 1}. **${p.name}** (${p.team || "No team"}, ${p.role || "No role"})\n   Match: ${p.match_type}${p.skill ? ` — Skill: ${p.skill} (${p.evidence_count} mentions)` : ""}${p.project ? ` — Project: ${p.project} (${p.role_in_project || "contributor"})` : ""}${p.similarity ? ` — Similarity: ${p.similarity.toFixed(3)}` : ""}`
      ).join("\n\n");

      return { content: [{ type: "text" as const, text: `## People\n\n${formatted}` }] };
    }
  );

  server.tool(
    "get_person_profile",
    "Get a full profile for a person: their skills, project involvement, and recent activity.",
    {
      person_id: z.string().optional().describe("UUID of the person"),
      name: z.string().optional().describe("Person's name (partial match)"),
    },
    async ({ person_id, name }) => {
      let person;
      if (person_id) {
        const { data } = await supabase.from("people").select("*").eq("id", person_id).single();
        person = data;
      } else if (name) {
        const { data } = await supabase.from("people").select("*").ilike("name", `%${name}%`).single();
        person = data;
      }

      if (!person) {
        return { content: [{ type: "text" as const, text: "Person not found." }] };
      }

      const { data: skills } = await supabase
        .from("people_skills").select("skill, evidence_count, last_seen")
        .eq("person_id", person.id).order("evidence_count", { ascending: false });

      const { data: projects } = await supabase
        .from("people_projects").select("project, role_in_project, last_mentioned")
        .eq("person_id", person.id).order("last_mentioned", { ascending: false });

      const profile = [
        `## ${person.name}`,
        `**Team:** ${person.team || "N/A"} | **Role:** ${person.role || "N/A"}`,
        "",
        `### Skills (${skills?.length || 0})`,
        skills?.map((s) => `- ${s.skill} (${s.evidence_count} mentions, last: ${s.last_seen ? new Date(s.last_seen).toLocaleDateString() : "unknown"})`).join("\n") || "No skills recorded.",
        "",
        `### Projects (${projects?.length || 0})`,
        projects?.map((p) => `- ${p.project} (${p.role_in_project || "contributor"}, last: ${p.last_mentioned ? new Date(p.last_mentioned).toLocaleDateString() : "unknown"})`).join("\n") || "No projects recorded.",
      ].join("\n");

      return { content: [{ type: "text" as const, text: profile }] };
    }
  );
}
```

---

## Task 3: Project status tool

**Create `mcp-server/src/tools/projects.ts`:**
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { supabase } from "../lib/supabase.js";

export function registerProjectTools(server: McpServer) {
  server.tool(
    "get_project_status",
    "Get all knowledge linked to a project: decisions, action items, related meetings, documents, and team members. Use when someone asks 'what's the status of project X?'",
    {
      project_name: z.string().describe("Project name to look up"),
    },
    async ({ project_name }) => {
      // Find project (check aliases too)
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .or(`name.ilike.%${project_name}%,aliases.cs.{${project_name}}`)
        .single();

      // Get team members
      const { data: team } = await supabase
        .from("people_projects")
        .select("project, role_in_project, people(name, role)")
        .ilike("project", `%${project_name}%`);

      // Get decisions about this project
      const { data: decisions } = await supabase
        .from("decisions")
        .select("decision, made_by, date")
        .ilike("decision", `%${project_name}%`)
        .order("date", { ascending: false })
        .limit(5);

      // Get action items for this project
      const { data: actions } = await supabase
        .from("action_items")
        .select("description, assignee, status, due_date")
        .ilike("description", `%${project_name}%`)
        .order("created_at", { ascending: false })
        .limit(10);

      const sections = [
        `## Project: ${project?.name || project_name}`,
        project?.status ? `**Status:** ${project.status}` : "",
        project?.client ? `**Client:** ${project.client}` : "",
        "",
        `### Team (${team?.length || 0})`,
        team?.map((t: any) => `- ${t.people?.name} (${t.role_in_project || "contributor"})`).join("\n") || "No team members recorded.",
        "",
        `### Recent Decisions (${decisions?.length || 0})`,
        decisions?.map((d) => `- ${d.decision} (${d.made_by || "Unknown"}, ${d.date ? new Date(d.date).toLocaleDateString() : "Unknown"})`).join("\n") || "No decisions recorded.",
        "",
        `### Action Items (${actions?.length || 0})`,
        actions?.map((a) => `- [${a.status}] ${a.description} → ${a.assignee || "Unassigned"}${a.due_date ? ` (due: ${a.due_date})` : ""}`).join("\n") || "No action items.",
      ];

      return { content: [{ type: "text" as const, text: sections.filter(Boolean).join("\n") }] };
    }
  );
}
```

**Register all new tools in `mcp-server/src/index.ts`:**
```typescript
import { registerStructuredTools } from "./tools/structured.js";
import { registerPeopleTools } from "./tools/people.js";
import { registerProjectTools } from "./tools/projects.js";

registerStructuredTools(server);
registerPeopleTools(server);
registerProjectTools(server);
```

---

## Verification

- [ ] `get_decisions(topic: "pricing")` returns relevant decisions
- [ ] `get_action_items(assignee: "John", status: "open")` returns filtered results
- [ ] `get_document(doc_id: "...")` returns full document content
- [ ] `find_people(skill: "React")` returns people with that skill + evidence counts
- [ ] `find_people(query: "mobile development")` returns semantic matches
- [ ] `get_person_profile(name: "John")` returns full profile with skills + projects
- [ ] `get_project_status(project_name: "Alpha")` returns team, decisions, and action items
- [ ] All 9 MCP tools work end-to-end from Claude Code
