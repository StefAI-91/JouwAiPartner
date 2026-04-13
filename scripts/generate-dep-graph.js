#!/usr/bin/env node

/**
 * Dependency Graph Generator
 *
 * Scans the monorepo for imports/exports and generates a structured
 * dependency graph in docs/dependency-graph.md.
 *
 * Usage: node scripts/generate-dep-graph.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// 1. File discovery
// ---------------------------------------------------------------------------

const SCAN_DIRS = [
  "packages/database/src/queries",
  "packages/database/src/mutations",
  "packages/database/src/supabase",
  "packages/ai/src/agents",
  "packages/ai/src/pipeline",
  "packages/ai/src/validations",
  "packages/ai/src",
  "packages/auth/src",
  "packages/mcp/src",
  "packages/ui/src",
  "apps/cockpit/src/actions",
  "apps/cockpit/src/app",
  "apps/cockpit/src/components",
  "apps/devhub/src/actions",
  "apps/devhub/src/app",
  "apps/devhub/src/components",
];

const SCAN_FILES = [
  "apps/cockpit/src/middleware.ts",
  "apps/devhub/src/middleware.ts",
];

function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      results.push(full);
    }
  }
  return results;
}

function discoverFiles() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    files.push(...walkDir(path.join(ROOT, dir)));
  }
  for (const file of SCAN_FILES) {
    const full = path.join(ROOT, file);
    if (fs.existsSync(full)) files.push(full);
  }
  // dedupe (some dirs overlap, e.g. packages/ai/src and packages/ai/src/agents)
  return [...new Set(files)];
}

// ---------------------------------------------------------------------------
// 2. Parsing
// ---------------------------------------------------------------------------

const EXPORT_FN = /export\s+(?:async\s+)?function\s+(\w+)/g;
const EXPORT_CONST = /export\s+(?:const|let)\s+(\w+)/g;
const EXPORT_TYPE = /export\s+(?:interface|type|enum)\s+(\w+)/g;
const IMPORT_LINE =
  /import\s+(?:type\s+)?(?:\{[^}]*\}|(\w+))\s+from\s+["']([^"']+)["']/g;
const NAMED_IMPORTS = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, "/");

  // --- exports ---
  const exports = { functions: [], constants: [], types: [] };

  for (const m of content.matchAll(EXPORT_FN)) exports.functions.push(m[1]);
  for (const m of content.matchAll(EXPORT_CONST)) exports.constants.push(m[1]);
  for (const m of content.matchAll(EXPORT_TYPE)) exports.types.push(m[1]);

  // --- imports ---
  const imports = []; // { names: string[], source: string, isType: boolean }
  for (const m of content.matchAll(NAMED_IMPORTS)) {
    const names = m[1]
      .split(",")
      .map((n) => n.trim().replace(/\s+as\s+\w+/, ""))
      .filter(Boolean);
    const source = m[2];
    const isType = /import\s+type\s/.test(m[0]);
    imports.push({ names, source, isType });
  }

  // default / namespace imports
  const defaultImportRe = /import\s+(\w+)\s+from\s+["']([^"']+)["']/g;
  for (const m of content.matchAll(defaultImportRe)) {
    // skip if already captured as named import (overlap check)
    if (!imports.some((i) => i.source === m[2])) {
      imports.push({ names: [m[1]], source: m[2], isType: false });
    }
  }

  return { filePath: relPath, exports, imports };
}

// ---------------------------------------------------------------------------
// 3. Classify imports
// ---------------------------------------------------------------------------

function classifySource(source) {
  if (source.startsWith("@repo/database")) return "database";
  if (source.startsWith("@repo/ai")) return "ai";
  if (source.startsWith("@repo/auth")) return "auth";
  if (source.startsWith("@repo/ui")) return "ui";
  if (source.startsWith("@repo/mcp")) return "mcp";
  if (source.startsWith(".") || source.startsWith("/")) return "local";
  return "external";
}

function getLayer(filePath) {
  if (filePath.startsWith("packages/database/src/queries")) return "db-queries";
  if (filePath.startsWith("packages/database/src/mutations")) return "db-mutations";
  if (filePath.startsWith("packages/ai/src/agents")) return "ai-agents";
  if (filePath.startsWith("packages/ai/src/pipeline")) return "ai-pipeline";
  if (filePath.startsWith("packages/ai/src/validations")) return "ai-validations";
  if (filePath.startsWith("packages/database/src/supabase")) return "db-clients";
  if (filePath.startsWith("packages/ai/src")) return "ai-core";
  if (filePath.startsWith("packages/auth")) return "auth";
  if (filePath.startsWith("packages/ui")) return "ui";
  if (filePath.startsWith("packages/mcp")) return "mcp";
  if (filePath.startsWith("apps/cockpit/src/actions")) return "cockpit-actions";
  if (filePath.includes("apps/cockpit/src/app") && filePath.includes("api/")) return "cockpit-api";
  if (filePath.startsWith("apps/cockpit/src/app")) return "cockpit-pages";
  if (filePath.startsWith("apps/cockpit/src/components")) return "cockpit-components";
  if (filePath.startsWith("apps/cockpit/src/middleware")) return "cockpit-middleware";
  if (filePath.startsWith("apps/devhub/src/actions")) return "devhub-actions";
  if (filePath.includes("apps/devhub/src/app") && filePath.includes("api/")) return "devhub-api";
  if (filePath.startsWith("apps/devhub/src/app")) return "devhub-pages";
  if (filePath.startsWith("apps/devhub/src/components")) return "devhub-components";
  if (filePath.startsWith("apps/devhub/src/middleware")) return "devhub-middleware";
  return "other";
}

const LAYER_LABELS = {
  "db-clients": "Database Clients",
  "db-queries": "Database Queries",
  "db-mutations": "Database Mutations",
  "ai-agents": "AI Agents",
  "ai-pipeline": "AI Pipeline",
  "ai-validations": "AI Validations",
  "ai-core": "AI Core",
  "auth": "Auth",
  "ui": "Shared UI Components",
  "mcp": "MCP Server",
  "cockpit-actions": "Cockpit Server Actions",
  "cockpit-api": "Cockpit API Routes",
  "cockpit-pages": "Cockpit Pages",
  "cockpit-components": "Cockpit Components",
  "cockpit-middleware": "Cockpit Middleware",
  "devhub-actions": "DevHub Server Actions",
  "devhub-api": "DevHub API Routes",
  "devhub-pages": "DevHub Pages",
  "devhub-components": "DevHub Components",
  "devhub-middleware": "DevHub Middleware",
};

// ---------------------------------------------------------------------------
// 4. Build the graph data
// ---------------------------------------------------------------------------

function buildGraph(parsedFiles) {
  // Group by layer
  const layers = {};
  for (const f of parsedFiles) {
    const layer = getLayer(f.filePath);
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(f);
  }

  // Cross-package edges: { from: filePath, to: package, names: string[] }
  const crossPkgEdges = [];
  for (const f of parsedFiles) {
    for (const imp of f.imports) {
      const cls = classifySource(imp.source);
      if (cls !== "local" && cls !== "external") {
        crossPkgEdges.push({
          from: f.filePath,
          fromLayer: getLayer(f.filePath),
          to: cls,
          toModule: imp.source,
          names: imp.names,
          isType: imp.isType,
        });
      }
    }
  }

  // Critical integration points (files importing from 3+ packages)
  const filePackageMap = {};
  for (const edge of crossPkgEdges) {
    if (!filePackageMap[edge.from]) filePackageMap[edge.from] = new Set();
    filePackageMap[edge.from].add(edge.to);
  }
  const criticalFiles = Object.entries(filePackageMap)
    .filter(([, pkgs]) => pkgs.size >= 3)
    .sort((a, b) => b[1].size - a[1].size)
    .map(([file, pkgs]) => ({ file, packages: [...pkgs] }));

  return { layers, crossPkgEdges, criticalFiles };
}

// ---------------------------------------------------------------------------
// 5. Render markdown
// ---------------------------------------------------------------------------

function renderMarkdown(graph, parsedFiles) {
  const lines = [];
  const now = new Date().toISOString().split("T")[0];

  lines.push("# Dependency Graph");
  lines.push("");
  lines.push(`> Auto-generated on ${now}. Do not edit manually.`);
  lines.push("> Run \`node scripts/generate-dep-graph.js\` to regenerate.");
  lines.push("");

  // ---- Stats overview ----
  lines.push("## Overview");
  lines.push("");

  const totalFns = parsedFiles.reduce(
    (sum, f) => sum + f.exports.functions.length + f.exports.constants.length,
    0,
  );
  const totalTypes = parsedFiles.reduce((sum, f) => sum + f.exports.types.length, 0);
  const totalEdges = graph.crossPkgEdges.length;

  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Files scanned | ${parsedFiles.length} |`);
  lines.push(`| Exported functions/constants | ${totalFns} |`);
  lines.push(`| Exported types/interfaces | ${totalTypes} |`);
  lines.push(`| Cross-package imports | ${totalEdges} |`);
  lines.push(`| Critical integration points (3+ packages) | ${graph.criticalFiles.length} |`);
  lines.push("");

  // ---- Package-level dependency flow ----
  lines.push("## Package Dependency Flow");
  lines.push("");
  lines.push("```");
  lines.push("┌─────────────────────────────────────────────────────────┐");
  lines.push("│                      APPS                              │");
  lines.push("│  ┌──────────────┐    ┌──────────────┐                  │");
  lines.push("│  │   Cockpit    │    │    DevHub     │                  │");
  lines.push("│  │ pages/actions│    │ pages/actions │                  │");
  lines.push("│  └──────┬───┬──┘    └──┬────┬───────┘                  │");
  lines.push("│         │   │          │    │                           │");
  lines.push("└─────────┼───┼──────────┼────┼───────────────────────────┘");
  lines.push("          │   │          │    │");
  lines.push("  ┌───────▼───▼──────────▼────▼───────────────────────┐");
  lines.push("  │                   PACKAGES                        │");
  lines.push("  │                                                   │");
  lines.push("  │  ┌────────────┐   ┌───────┐   ┌──────┐  ┌─────┐  │");
  lines.push("  │  │  database  │◄──│  ai   │   │ auth │  │ mcp │  │");
  lines.push("  │  │queries/mut.│   │agents/│   │      │  │     │  │");
  lines.push("  │  │            │   │pipeline│  │      │  │     │  │");
  lines.push("  │  └─────┬──────┘   └───┬───┘   └──────┘  └──┬──┘  │");
  lines.push("  │        │              │                     │     │");
  lines.push("  └────────┼──────────────┼─────────────────────┼─────┘");
  lines.push("           │              │                     │");
  lines.push("           ▼              ▼                     ▼");
  lines.push("       Supabase     Claude/Cohere          MCP Clients");
  lines.push("```");
  lines.push("");

  // ---- Per-layer sections ----
  const layerOrder = [
    "db-clients",
    "db-queries",
    "db-mutations",
    "ai-agents",
    "ai-pipeline",
    "ai-core",
    "ai-validations",
    "auth",
    "ui",
    "mcp",
    "cockpit-actions",
    "cockpit-api",
    "cockpit-pages",
    "cockpit-components",
    "cockpit-middleware",
    "devhub-actions",
    "devhub-api",
    "devhub-pages",
    "devhub-components",
    "devhub-middleware",
  ];

  for (const layerKey of layerOrder) {
    const files = graph.layers[layerKey];
    if (!files || files.length === 0) continue;

    const label = LAYER_LABELS[layerKey] || layerKey;
    lines.push(`## ${label}`);
    lines.push("");

    // Sort files by name
    const sorted = [...files].sort((a, b) => a.filePath.localeCompare(b.filePath));

    for (const f of sorted) {
      const allExports = [
        ...f.exports.functions,
        ...f.exports.constants,
      ];
      const typeExports = f.exports.types;

      if (allExports.length === 0 && typeExports.length === 0) continue;

      const shortPath = f.filePath.replace(/^packages\/database\/src\//, "");
      const fileName = path.basename(f.filePath, path.extname(f.filePath));
      lines.push(`### \`${shortPath}\``);
      lines.push("");

      if (allExports.length > 0) {
        lines.push("**Exports:**");
        for (const fn of f.exports.functions) {
          lines.push(`- \`${fn}()\``);
        }
        for (const c of f.exports.constants) {
          lines.push(`- \`${c}\``);
        }
        lines.push("");
      }

      if (typeExports.length > 0) {
        lines.push("**Types:** " + typeExports.map((t) => `\`${t}\``).join(", "));
        lines.push("");
      }

      // Show cross-package dependencies
      const deps = f.imports.filter(
        (i) => classifySource(i.source) !== "external" && classifySource(i.source) !== "local",
      );
      if (deps.length > 0) {
        lines.push("**Depends on:**");
        for (const dep of deps) {
          const fns = dep.names.join(", ");
          const prefix = dep.isType ? "(type) " : "";
          lines.push(`- ${prefix}\`${dep.source}\` → ${fns}`);
        }
        lines.push("");
      }

      // Show local (intra-package) dependencies for pipeline/agents
      if (
        layerKey.startsWith("ai-") ||
        layerKey === "mcp"
      ) {
        const localDeps = f.imports.filter(
          (i) => classifySource(i.source) === "local" && !i.source.includes("node_modules"),
        );
        if (localDeps.length > 0) {
          lines.push("**Internal deps:**");
          for (const dep of localDeps) {
            const fns = dep.names.join(", ");
            lines.push(`- \`${dep.source}\` → ${fns}`);
          }
          lines.push("");
        }
      }
    }
  }

  // ---- Cross-package dependency matrix ----
  lines.push("## Cross-Package Dependency Matrix");
  lines.push("");
  lines.push("Which layers depend on which packages:");
  lines.push("");

  const allLayers = [...new Set(graph.crossPkgEdges.map((e) => e.fromLayer))].sort();
  const allPkgs = ["database", "ai", "auth", "ui", "mcp"];

  lines.push(
    `| Layer | ${allPkgs.map((p) => p).join(" | ")} | Total |`,
  );
  lines.push(
    `|-------|${allPkgs.map(() => "---").join("|")}|-------|`,
  );

  for (const layer of allLayers) {
    const label = LAYER_LABELS[layer] || layer;
    const counts = {};
    let total = 0;
    for (const pkg of allPkgs) {
      const count = graph.crossPkgEdges.filter(
        (e) => e.fromLayer === layer && e.to === pkg,
      ).length;
      counts[pkg] = count;
      total += count;
    }
    if (total === 0) continue;
    lines.push(
      `| ${label} | ${allPkgs.map((p) => counts[p] || "-").join(" | ")} | ${total} |`,
    );
  }
  lines.push("");

  // ---- Critical integration points ----
  lines.push("## Critical Integration Points");
  lines.push("");
  lines.push("Files that import from 3+ shared packages. These are the most interconnected");
  lines.push("parts of the codebase — changes here have the widest blast radius.");
  lines.push("");

  if (graph.criticalFiles.length === 0) {
    lines.push("_No files import from 3+ packages._");
  } else {
    lines.push(`| File | Packages | Count |`);
    lines.push(`|------|----------|-------|`);
    for (const { file, packages } of graph.criticalFiles) {
      lines.push(
        `| \`${file}\` | ${packages.join(", ")} | ${packages.length} |`,
      );
    }
  }
  lines.push("");

  // ---- Function-level dependency chains (most useful for Claude) ----
  lines.push("## Key Dependency Chains");
  lines.push("");
  lines.push("Tracing the most important data flows from action → pipeline → database.");
  lines.push("");

  // Build a reverse index: for each @repo import target, which files import it
  const reverseIndex = {};
  for (const f of parsedFiles) {
    for (const imp of f.imports) {
      const cls = classifySource(imp.source);
      if (cls !== "external") {
        for (const name of imp.names) {
          const key = `${imp.source}::${name}`;
          if (!reverseIndex[key]) reverseIndex[key] = [];
          reverseIndex[key].push(f.filePath);
        }
      }
    }
  }

  // Find mutations that are imported by actions (action → mutation chain)
  const mutationFiles = graph.layers["db-mutations"] || [];
  const chains = [];
  for (const mutFile of mutationFiles) {
    for (const fn of mutFile.exports.functions) {
      // Find who imports this mutation
      const importers = [];
      for (const f of parsedFiles) {
        for (const imp of f.imports) {
          if (imp.names.includes(fn) && imp.source.includes("mutations")) {
            importers.push(f.filePath);
          }
        }
      }
      if (importers.length > 0) {
        chains.push({
          mutation: fn,
          mutationFile: mutFile.filePath,
          callers: importers,
        });
      }
    }
  }

  // Group by mutation file and show the chains
  const byMutFile = {};
  for (const chain of chains) {
    if (!byMutFile[chain.mutationFile]) byMutFile[chain.mutationFile] = [];
    byMutFile[chain.mutationFile].push(chain);
  }

  for (const [mutFile, fileChains] of Object.entries(byMutFile).sort()) {
    const shortMut = mutFile.replace("packages/database/src/", "");
    lines.push(`### ${shortMut}`);
    lines.push("");
    lines.push("| Mutation | Called from |");
    lines.push("|----------|------------|");
    for (const chain of fileChains) {
      const callerList = chain.callers
        .map((c) => `\`${c}\``)
        .join(", ");
      lines.push(`| \`${chain.mutation}()\` | ${callerList} |`);
    }
    lines.push("");
  }

  // ---- Reverse index for queries ----
  lines.push("## Query Usage Map");
  lines.push("");
  lines.push("Which queries are used where across the codebase.");
  lines.push("");

  const queryFiles = graph.layers["db-queries"] || [];
  for (const qFile of queryFiles.sort((a, b) => a.filePath.localeCompare(b.filePath))) {
    const fns = qFile.exports.functions;
    if (fns.length === 0) continue;

    const shortQ = qFile.filePath.replace("packages/database/src/", "");
    const usedFns = [];

    for (const fn of fns) {
      const callers = [];
      for (const f of parsedFiles) {
        if (f.filePath === qFile.filePath) continue;
        for (const imp of f.imports) {
          if (imp.names.includes(fn)) {
            callers.push(f.filePath);
          }
        }
      }
      if (callers.length > 0) {
        usedFns.push({ fn, callers });
      }
    }

    if (usedFns.length === 0) continue;

    lines.push(`### ${shortQ}`);
    lines.push("");
    lines.push("| Query | Used in |");
    lines.push("|-------|---------|");
    for (const { fn, callers } of usedFns) {
      lines.push(`| \`${fn}()\` | ${callers.map((c) => `\`${c}\``).join(", ")} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

function main() {
  console.log("Scanning codebase...");
  const files = discoverFiles();
  console.log(`Found ${files.length} files to analyze.`);

  console.log("Parsing imports & exports...");
  const parsed = files.map(parseFile);

  console.log("Building dependency graph...");
  const graph = buildGraph(parsed);

  const md = renderMarkdown(graph, parsed);

  const outPath = path.join(ROOT, "docs", "dependency-graph.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, "utf-8");

  console.log(`\nDependency graph written to: docs/dependency-graph.md`);
  console.log(`  - ${parsed.length} files scanned`);
  console.log(
    `  - ${parsed.reduce((s, f) => s + f.exports.functions.length + f.exports.constants.length, 0)} exported functions`,
  );
  console.log(`  - ${graph.crossPkgEdges.length} cross-package imports`);
  console.log(`  - ${graph.criticalFiles.length} critical integration points`);
}

main();
