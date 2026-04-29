interface MountConfig {
  projectId: string;
  apiUrl: string;
  userEmail: string | null;
}

interface DummyModalProps {
  config: MountConfig;
  onClose: () => void;
}

/**
 * V0 dummy modal. Toont alleen de geconfigureerde projectId zodat we kunnen
 * verifiëren dat loader → widget bundle → mount-flow werkt. WG-003 vervangt
 * dit door de echte feedback-modal (type-keuze, textarea, submit).
 */
export function DummyModal({ config, onClose }: DummyModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="jaip-widget-dummy-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 24,
          borderRadius: 12,
          maxWidth: 360,
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <h2
          id="jaip-widget-dummy-title"
          style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}
        >
          Hello widget
        </h2>
        <p style={{ fontSize: 14, color: "#475569", margin: "0 0 16px" }}>
          Project: <code>{config.projectId}</code>
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "#0f172a",
            color: "#fff",
            border: 0,
            cursor: "pointer",
            font: "500 14px system-ui",
          }}
        >
          Sluiten
        </button>
      </div>
    </div>
  );
}
