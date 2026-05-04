import { render } from "preact";
import { Modal } from "./modal";
import widgetStyles from "./styles.css";

interface MountConfig {
  projectId: string;
  apiUrl: string;
  userEmail: string | null;
  /** WG-006: voor lazy-load van widget-screenshot.js — afgeleid van widget.js URL */
  bundleSrc: string;
}

declare global {
  interface Window {
    __JAIPWidget?: {
      mount: (root: ShadowRoot, config: MountConfig) => void;
    };
  }
}

/**
 * WG-003 entry: mountt de echte feedback-modal in de Shadow DOM. Styles
 * worden via een `<style>`-tag in de shadow root geïnjecteerd zodat host-
 * styling niet kan lekken.
 */
window.__JAIPWidget = {
  mount(root, config) {
    ensureStyles(root);

    // Bewaar de actieve element in de Shadow Root (de Feedback-trigger)
    // vóór de modal mount — `document.activeElement` ziet alleen de host,
    // niet wat er binnen het shadow-tree focus heeft. Doorgeven aan Modal
    // zodat focus-restore op close de juiste knop weer pakt.
    const trigger = (root.activeElement as HTMLElement | null) ?? null;

    let container = root.querySelector<HTMLDivElement>("#__jaip-widget-modal");
    if (!container) {
      container = document.createElement("div");
      container.id = "__jaip-widget-modal";
      root.appendChild(container);
    }

    const close = () => {
      // Preact's render(null, container) verwijdert de tree én ruimt event
      // listeners op die de Modal heeft geregistreerd via useEffect-cleanup.
      render(null, container!);
    };

    render(<Modal config={config} trigger={trigger} onClose={close} />, container);
  },
};

function ensureStyles(root: ShadowRoot) {
  if (root.querySelector("#__jaip-widget-styles")) return;
  const style = document.createElement("style");
  style.id = "__jaip-widget-styles";
  style.textContent = widgetStyles;
  root.appendChild(style);
}
