import { render } from "preact";
import { DummyModal } from "./modal";

interface MountConfig {
  projectId: string;
  apiUrl: string;
  userEmail: string | null;
}

declare global {
  interface Window {
    __JAIPWidget?: {
      mount: (root: ShadowRoot, config: MountConfig) => void;
    };
  }
}

/**
 * V0 entry: mount een dummy "Hello widget"-modal in de shadow root.
 * WG-003 vervangt dit door de echte feedback-modal met type-keuze, textarea
 * en POST naar het ingest-endpoint.
 */
window.__JAIPWidget = {
  mount(root, config) {
    let container = root.querySelector<HTMLDivElement>("#__jaip-widget-modal");
    if (!container) {
      container = document.createElement("div");
      container.id = "__jaip-widget-modal";
      root.appendChild(container);
    }
    render(<DummyModal config={config} onClose={() => render(null, container!)} />, container);
  },
};
