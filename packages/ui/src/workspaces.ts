import { LayoutDashboard, Wrench, MessagesSquare } from "lucide-react";

/**
 * Workspaces (a.k.a. quadranten) in het AI-Native platform.
 *
 * Bron van waarheid voor de WorkspaceSwitcher zodat cockpit, devhub en
 * (later) portal precies dezelfde opties tonen.
 *
 * URLs komen uit env vars (`NEXT_PUBLIC_COCKPIT_URL`, `NEXT_PUBLIC_DEVHUB_URL`,
 * `NEXT_PUBLIC_PORTAL_URL`) met localhost-defaults voor dev. Omdat elk
 * quadrant een aparte Next.js app is wordt altijd cross-origin genavigeerd
 * via een gewone `<a href>` (geen `<Link>`).
 */

export type WorkspaceId = "cockpit" | "devhub" | "portal";

export type WorkspaceStatus = "active" | "coming_soon";

export interface Workspace {
  id: WorkspaceId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  status: WorkspaceStatus;
}

/** Bekende productie-deployments. Dient als fallback wanneer geen env var is gezet. */
const PROD_FALLBACKS = {
  devhub: "https://jouw-ai-partner-devhub.vercel.app",
  // TODO: cockpit + portal production URLs invullen zodra bekend.
  cockpit: "",
  portal: "",
} as const;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function readEnv(key: string, devFallback: string, prodFallback: string): string {
  // process.env lookups via string keys worden niet door Next inline-replaced,
  // dus we gebruiken expliciete property-accessors per variabele.
  const fallback = isProduction() && prodFallback ? prodFallback : devFallback;
  if (key === "NEXT_PUBLIC_COCKPIT_URL") {
    return process.env.NEXT_PUBLIC_COCKPIT_URL ?? fallback;
  }
  if (key === "NEXT_PUBLIC_DEVHUB_URL") {
    return process.env.NEXT_PUBLIC_DEVHUB_URL ?? fallback;
  }
  if (key === "NEXT_PUBLIC_PORTAL_URL") {
    return process.env.NEXT_PUBLIC_PORTAL_URL ?? fallback;
  }
  return fallback;
}

/** Alle workspaces in vaste volgorde: Cockpit → DevHub → Portal. */
export function getWorkspaces(): Workspace[] {
  return [
    {
      id: "cockpit",
      label: "Cockpit",
      description: "Strategy & PM",
      icon: LayoutDashboard,
      url: readEnv("NEXT_PUBLIC_COCKPIT_URL", "http://localhost:3000", PROD_FALLBACKS.cockpit),
      status: "active",
    },
    {
      id: "devhub",
      label: "DevHub",
      description: "Build & Execute",
      icon: Wrench,
      url: readEnv("NEXT_PUBLIC_DEVHUB_URL", "http://localhost:3001", PROD_FALLBACKS.devhub),
      status: "active",
    },
    {
      id: "portal",
      label: "Portal",
      description: "Client transparency",
      icon: MessagesSquare,
      url: readEnv("NEXT_PUBLIC_PORTAL_URL", "", PROD_FALLBACKS.portal),
      status: "coming_soon",
    },
  ];
}

export function getWorkspace(id: WorkspaceId): Workspace {
  const workspace = getWorkspaces().find((w) => w.id === id);
  if (!workspace) {
    throw new Error(`Unknown workspace id: ${id}`);
  }
  return workspace;
}
