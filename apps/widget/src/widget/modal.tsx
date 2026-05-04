import { useState, useEffect, useRef, useCallback } from "react";

interface MountConfig {
  projectId: string;
  apiUrl: string;
  userEmail: string | null;
  bundleSrc: string;
}

interface CapturedScreenshot {
  dataUrl: string;
  width: number;
  height: number;
}

type ScreenshotState = "idle" | "capturing" | "ready" | "error";

/**
 * WG-006 cross-bundle binding. `widget-screenshot.js` is een aparte
 * lazy-bundle die `window.__JAIPWidgetScreenshot` zet — TypeScript ziet die
 * declare niet over bundle-grenzen, dus hier herhalen voor compile-time check.
 */
declare global {
  interface Window {
    __JAIPWidgetScreenshot?: {
      capture: () => Promise<CapturedScreenshot>;
    };
  }
}

interface ModalProps {
  config: MountConfig;
  /**
   * Element dat focus had vóór open. Bij close geven we focus daarheen
   * terug. Mag null zijn — dan wordt geen restore gedaan. Wordt vanuit
   * `mount()` aangeleverd omdat `document.activeElement` in een Shadow
   * DOM context alleen de host ziet, niet de échte trigger.
   */
  trigger?: HTMLElement | null;
  onClose: () => void;
}

type FeedbackType = "bug" | "idea" | "question";
type Status = "idle" | "submitting" | "success" | "error";

const TYPE_OPTIONS: ReadonlyArray<{
  value: FeedbackType;
  label: string;
  description: string;
  icon: string;
}> = [
  { value: "bug", label: "Bug", description: "Iets werkt niet zoals verwacht", icon: "bug" },
  { value: "idea", label: "Idee", description: "Suggestie of verbetering", icon: "idea" },
  { value: "question", label: "Vraag", description: "Hulp of uitleg nodig", icon: "question" },
];

const MIN_DESCRIPTION_LENGTH = 10;
const SUCCESS_AUTOCLOSE_MS = 2000;

/**
 * Mapping van Zod-veldpaden naar Nederlandse labels. Bij een validation-
 * response toont de modal "Validatie mislukt — controleer: [labels]" zodat
 * de gebruiker weet welk veld te fixen i.p.v. een kale "validation".
 * Onbekende velden vallen terug op het ruwe veldpad.
 */
const FIELD_LABELS: Record<string, string> = {
  project_id: "project-ID",
  type: "type",
  description: "beschrijving",
  context: "context",
  reporter_email: "e-mailadres",
  screenshot: "screenshot",
};

function formatSubmitError(
  status: number,
  body: {
    error?: string;
    details?: {
      formErrors?: string[];
      fieldErrors?: Record<string, string[] | undefined>;
    };
  } | null,
): string {
  if (body?.error === "validation" && body.details) {
    // Volledige Zod-output naar console zodat developers in DevTools
    // direct kunnen zien wélke regel faalt (bv. "data_url length > 700000").
    console.warn("[JAIP Widget] validation details:", body.details);
    const fieldErrors = body.details.fieldErrors ?? {};
    const failing = Object.keys(fieldErrors)
      .filter((k) => (fieldErrors[k]?.length ?? 0) > 0)
      .map((k) => FIELD_LABELS[k] ?? k);
    if (failing.length > 0) {
      return `validatie mislukt — controleer ${failing.join(", ")}`;
    }
  }
  return body?.error ?? `HTTP ${status}`;
}

/**
 * WG-003 feedback modal. Mountt in een Shadow DOM zodat host-styling niet
 * lekt. Alle interactieve elementen zijn keyboard-accessible (focus-trap,
 * Escape sluit, ARIA-labels). Bij submit POST naar het ingest-endpoint met
 * auto-context (URL, viewport, userAgent).
 */
export function Modal({ config, trigger, onClose }: ModalProps) {
  const [type, setType] = useState<FeedbackType | null>(null);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [screenshot, setScreenshot] = useState<CapturedScreenshot | null>(null);
  const [screenshotState, setScreenshotState] = useState<ScreenshotState>("idle");
  const [screenshotError, setScreenshotError] = useState("");

  const dialogRef = useRef<HTMLDivElement>(null);

  const safeClose = useCallback(() => {
    if (status === "submitting") return;
    onClose();
  }, [onClose, status]);

  // A11y: focus de eerste interactieve knop bij open, restore naar de
  // door `mount()` doorgegeven trigger bij close. Trigger wordt buiten
  // de modal gevangen omdat `document.activeElement` in een Shadow DOM
  // de host teruggeeft, niet de werkelijke trigger-button.
  useEffect(() => {
    const firstButton = dialogRef.current?.querySelector<HTMLElement>("button:not([disabled])");
    firstButton?.focus();
    return () => {
      trigger?.focus?.();
    };
  }, [trigger]);

  // A11y: Escape sluit modal, Tab loopt rond binnen modal.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        safeClose();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        trapFocus(event, dialogRef.current);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [safeClose]);

  const trimmedLength = description.trim().length;
  const canSubmit = type !== null && trimmedLength >= MIN_DESCRIPTION_LENGTH && status === "idle";

  async function handleCaptureScreenshot() {
    if (screenshotState === "capturing") return;
    setScreenshotState("capturing");
    setScreenshotError("");
    try {
      await loadScreenshotBundle(config.bundleSrc);
      const result = await window.__JAIPWidgetScreenshot?.capture();
      if (!result) {
        throw new Error("screenshot bundle niet beschikbaar");
      }
      setScreenshot(result);
      setScreenshotState("ready");
    } catch (err) {
      setScreenshotState("error");
      setScreenshotError(
        err instanceof Error ? err.message : "Screenshot maken mislukte — probeer opnieuw.",
      );
    }
  }

  function handleRemoveScreenshot() {
    setScreenshot(null);
    setScreenshotState("idle");
    setScreenshotError("");
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    if (!canSubmit || type === null) return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: config.projectId,
          type,
          description: description.trim(),
          context: {
            url: window.location.href,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            user_agent: navigator.userAgent,
          },
          reporter_email: config.userEmail ?? null,
          screenshot: screenshot
            ? {
                data_url: screenshot.dataUrl,
                width: screenshot.width,
                height: screenshot.height,
              }
            : null,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          details?: {
            formErrors?: string[];
            fieldErrors?: Record<string, string[] | undefined>;
          };
        } | null;
        throw new Error(formatSubmitError(response.status, body));
      }
      setStatus("success");
      window.setTimeout(onClose, SUCCESS_AUTOCLOSE_MS);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Versturen mislukt — probeer opnieuw.",
      );
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      safeClose();
    }
  }

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";
  const submitLabel = isSubmitting ? "Versturen…" : "Versturen";

  return (
    <div class="jaip-overlay" onClick={handleOverlayClick} data-status={status}>
      <div
        ref={dialogRef}
        class="jaip-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="jaip-widget-title"
        aria-describedby="jaip-widget-subtitle"
      >
        <div class="jaip-header">
          <div>
            <h2 id="jaip-widget-title" class="jaip-title">
              Stuur feedback
            </h2>
            <p id="jaip-widget-subtitle" class="jaip-subtitle">
              We lezen elke melding mee — dank je wel.
            </p>
          </div>
          <button
            type="button"
            class="jaip-close"
            aria-label="Sluiten"
            onClick={safeClose}
            disabled={isSubmitting}
          >
            <CloseIcon />
          </button>
        </div>

        {isSuccess ? (
          <div class="jaip-success" role="status" aria-live="polite">
            <CheckIcon />
            <p class="jaip-success-text">Bedankt! Je feedback is ontvangen.</p>
          </div>
        ) : (
          <form class="jaip-form" onSubmit={handleSubmit}>
            <fieldset class="jaip-types" disabled={isSubmitting}>
              <legend class="jaip-label">Wat wil je melden?</legend>
              <div class="jaip-types-grid">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    class="jaip-type"
                    aria-label={`${option.label}: ${option.description}`}
                    aria-pressed={type === option.value}
                    onClick={() => setType(option.value)}
                  >
                    <TypeIcon name={option.icon} />
                    <span class="jaip-type-label">{option.label}</span>
                    <span class="jaip-type-desc">{option.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div class="jaip-field">
              <label class="jaip-label" htmlFor="jaip-widget-description">
                Beschrijving
              </label>
              <textarea
                id="jaip-widget-description"
                class="jaip-textarea"
                rows={5}
                value={description}
                onInput={(event) =>
                  setDescription((event.currentTarget as HTMLTextAreaElement).value)
                }
                placeholder="Wat is er aan de hand? Wees zo specifiek mogelijk."
                aria-describedby="jaip-widget-description-hint"
                disabled={isSubmitting}
                required
              />
              <p id="jaip-widget-description-hint" class="jaip-hint">
                Minimaal {MIN_DESCRIPTION_LENGTH} tekens (
                {Math.min(trimmedLength, MIN_DESCRIPTION_LENGTH)}/{MIN_DESCRIPTION_LENGTH}).
              </p>
            </div>

            <ScreenshotField
              state={screenshotState}
              screenshot={screenshot}
              error={screenshotError}
              disabled={isSubmitting}
              onCapture={handleCaptureScreenshot}
              onRemove={handleRemoveScreenshot}
            />

            {isError ? (
              <div class="jaip-error" role="alert">
                Er ging iets mis: {errorMessage || "onbekende fout"}.
              </div>
            ) : null}

            <div class="jaip-actions">
              <button
                type="button"
                class="jaip-btn jaip-btn-ghost"
                onClick={safeClose}
                disabled={isSubmitting}
              >
                Annuleren
              </button>
              <button
                type="submit"
                class="jaip-btn jaip-btn-primary"
                disabled={!canSubmit}
                aria-busy={isSubmitting}
              >
                {submitLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * WG-006 lazy-load van widget-screenshot.js. Identiek patroon aan loader →
 * widget.js: cross-origin script-tag, gedeelde Promise voor concurrente
 * klikken, reset bij onerror zodat een netwerk-glitch niet permanent
 * de feature uitschakelt.
 */
let screenshotBundlePromise: Promise<void> | null = null;

function loadScreenshotBundle(widgetBundleSrc: string): Promise<void> {
  if (screenshotBundlePromise) return screenshotBundlePromise;
  screenshotBundlePromise = new Promise<void>((resolve, reject) => {
    const src = widgetBundleSrc.replace(/widget\.js(\?.*)?$/, "widget-screenshot.js");
    const tag = document.createElement("script");
    tag.src = src;
    tag.async = true;
    tag.onload = () => resolve();
    tag.onerror = () => {
      screenshotBundlePromise = null;
      reject(new Error("widget-screenshot.js failed to load"));
    };
    document.head.appendChild(tag);
  });
  return screenshotBundlePromise;
}

interface ScreenshotFieldProps {
  state: ScreenshotState;
  screenshot: CapturedScreenshot | null;
  error: string;
  disabled: boolean;
  onCapture: () => void;
  onRemove: () => void;
}

function ScreenshotField({
  state,
  screenshot,
  error,
  disabled,
  onCapture,
  onRemove,
}: ScreenshotFieldProps) {
  if (state === "ready" && screenshot) {
    return (
      <div class="jaip-screenshot jaip-screenshot-ready">
        <img
          src={screenshot.dataUrl}
          alt="Screenshot van de pagina"
          class="jaip-screenshot-thumb"
        />
        <div class="jaip-screenshot-meta">
          <span>
            Screenshot bijgevoegd ({screenshot.width}×{screenshot.height})
          </span>
          <button
            type="button"
            class="jaip-screenshot-remove"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Screenshot verwijderen"
          >
            Verwijderen
          </button>
        </div>
      </div>
    );
  }

  const capturing = state === "capturing";
  return (
    <div class="jaip-screenshot">
      <button
        type="button"
        class="jaip-btn jaip-btn-ghost jaip-screenshot-add"
        onClick={onCapture}
        disabled={disabled || capturing}
        aria-busy={capturing}
      >
        <CameraIcon />
        <span>{capturing ? "Screenshot maken…" : "Screenshot toevoegen"}</span>
      </button>
      {state === "error" ? (
        <p class="jaip-hint jaip-screenshot-error" role="alert">
          {error || "Screenshot maken mislukte — probeer opnieuw."}
        </p>
      ) : null}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M4 7h3l2-2h6l2 2h3v12H4V7z"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke="currentColor" stroke-width="1.6" />
    </svg>
  );
}

function trapFocus(event: KeyboardEvent, container: HTMLElement) {
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active =
    container.getRootNode() instanceof ShadowRoot
      ? (container.getRootNode() as ShadowRoot).activeElement
      : document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
    </svg>
  );
}

function TypeIcon({ name }: { name: string }) {
  if (name === "bug") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="M9 4l1.5 2h3L15 4M6 9h12M6 9v6a6 6 0 0 0 12 0V9M3 12h3m12 0h3M5 18l2-1m12 1l-2-1M5 6l2 1m12-1l-2 1"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
    );
  }
  if (name === "idea") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1.2 1.6 1.4 2.5h5.2c.2-.9.7-1.8 1.4-2.5A6 6 0 0 0 12 3z"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1.1-1.5 2.2v.5M12 17.5h.01"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
    </svg>
  );
}
