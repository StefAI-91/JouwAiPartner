/**
 * JAIP Widget loader. Tiny vanilla-JS bootstrapper die op elke pageload draait.
 * Bouwt een floating button in een Shadow DOM en lazy-loadt `widget.js` pas
 * bij de eerste klik. Zo blijft de baseline-pageload-cost minimaal.
 *
 * Gebruik:
 *   <script
 *     src="https://widget.jouw-ai-partner.nl/loader.js"
 *     data-project="<project-uuid>"
 *     data-user-email="optional@example.com"
 *     async
 *   ></script>
 */

// Forceert dat TypeScript dit bestand als module behandelt (anders is
// `declare global` niet toegestaan). esbuild bundelt 'm sowieso als IIFE,
// dus het lege export is runtime een no-op.
export {};

interface MountConfig {
  projectId: string;
  apiUrl: string;
  userEmail: string | null;
}

interface JAIPWidgetGlobal {
  mount: (root: ShadowRoot, config: MountConfig) => void;
}

interface JAIPWidgetIdentifyInfo {
  email: string;
}

declare global {
  interface Window {
    __JAIPWidget?: JAIPWidgetGlobal;
    /**
     * Runtime-API voor SPA's die het ingelogde email pas na hydration weten
     * (bijv. na een `/me`-fetch). Volgende keer dat de modal mountt gebruikt
     * hij de nieuwe email. WG-004 (klant-rollout).
     */
    __JAIPWidgetIdentify?: (info: JAIPWidgetIdentifyInfo) => void;
  }
}

(function () {
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) {
    console.warn("[JAIP Widget] geen currentScript context — loader genegeerd");
    return;
  }
  const projectId = script.dataset.project;
  if (!projectId) {
    console.warn("[JAIP Widget] data-project attribuut ontbreekt — loader genegeerd");
    return;
  }

  // API-URL hardcoded naar productie. Voor staging override via een global
  // hook (window.__JAIPWidgetApiUrl) — geen data-attribute zodat klanten
  // niet per ongeluk hun eigen DevHub kiezen.
  const apiUrl =
    (window as unknown as { __JAIPWidgetApiUrl?: string }).__JAIPWidgetApiUrl ??
    "https://devhub.jouw-ai-partner.nl/api/ingest/widget";

  let userEmail = script.dataset.userEmail ?? null;

  // Runtime-identify voor klant-SPA's. Triage gebruikt dit email als hint,
  // niet als bewijs — een browser kan altijd spoofen, maar de origin-
  // whitelist blijft als hek staan. Cap op 320 chars (RFC-max e-mail).
  window.__JAIPWidgetIdentify = (info) => {
    if (info && typeof info.email === "string" && info.email.length <= 320) {
      userEmail = info.email;
    }
  };

  const host = document.createElement("div");
  host.id = "__jaip-widget-host";
  host.style.cssText = "position:fixed;bottom:0;right:0;z-index:2147483647;";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Feedback";
  button.setAttribute("aria-label", "Feedback geven");
  button.style.cssText = [
    "position:fixed",
    "bottom:24px",
    "right:24px",
    "padding:12px 20px",
    "border-radius:24px",
    "background:#0f172a",
    "color:#fff",
    "border:0",
    "cursor:pointer",
    "font:500 14px system-ui",
    "box-shadow:0 4px 12px rgba(0,0,0,0.15)",
  ].join(";");
  shadow.appendChild(button);

  let widgetLoaded = false;
  let loading = false;

  // Cross-origin script injection ipv dynamic import: robuuster en werkt
  // ook in oudere browsers zonder een module-bundler-runtime aan kant van
  // de host.
  function loadWidget(): Promise<void> {
    if (widgetLoaded) return Promise.resolve();
    if (loading) return new Promise((resolve) => setTimeout(() => resolve(loadWidget()), 50));
    loading = true;

    return new Promise((resolve, reject) => {
      const widgetSrc = script!.src.replace(/loader\.js(\?.*)?$/, "widget.js");
      const tag = document.createElement("script");
      tag.src = widgetSrc;
      tag.async = true;
      tag.onload = () => {
        widgetLoaded = true;
        loading = false;
        resolve();
      };
      tag.onerror = () => {
        loading = false;
        reject(new Error("widget.js failed to load"));
      };
      document.head.appendChild(tag);
    });
  }

  button.addEventListener("click", async () => {
    try {
      await loadWidget();
      window.__JAIPWidget?.mount(shadow, { projectId, apiUrl, userEmail });
    } catch (err) {
      console.error("[JAIP Widget]", err);
    }
  });
})();
