import { render } from "preact";
import { Modal } from "./modal";
import widgetStyles from "./styles.css";

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
 * WG-003 entry: mountt de echte feedback-modal in de Shadow DOM. Styles
 * worden via een `<style>`-tag in de shadow root geïnjecteerd zodat host-
 * styling niet kan lekken.
 */
window.__JAIPWidget = {
  mount(root, config) {
    ensureStyles(root);

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

    render(<Modal config={config} onClose={close} />, container);
  },
};

function ensureStyles(root: ShadowRoot) {
  if (root.querySelector("#__jaip-widget-styles")) return;
  const style = document.createElement("style");
  style.id = "__jaip-widget-styles";
  style.textContent = widgetStyles;
  root.appendChild(style);
}
