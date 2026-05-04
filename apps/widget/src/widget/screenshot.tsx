import html2canvas from "html2canvas";
import {
  createCanvasColorResolver,
  inlineUnsupportedColors,
  normalizeStylesheets,
} from "./normalize-colors";

/**
 * WG-006 lazy screenshot-bundle. Pas geladen wanneer gebruiker op
 * "Screenshot toevoegen" in de modal klikt — html2canvas + helpers
 * zit hier in een aparte bundle (~30 KB gzip) zodat baseline `widget.js`
 * klein blijft (~11 KB gzip) voor mensen die het niet gebruiken.
 *
 * Bind aan `window.__JAIPWidgetScreenshot.capture`. Geen esbuild
 * `globalName` (zie WG-007: var-shadow tegen window-binding) — handmatig
 * `window.__JAIPWidgetScreenshot=` schrijven in de IIFE is genoeg en
 * de build-guard valideert dat het er ook echt staat.
 */

interface CaptureResult {
  dataUrl: string;
  width: number;
  height: number;
}

declare global {
  interface Window {
    __JAIPWidgetScreenshot?: {
      capture: () => Promise<CaptureResult>;
    };
  }
}

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.7;

window.__JAIPWidgetScreenshot = {
  async capture(): Promise<CaptureResult> {
    // Capture beperkt tot zichtbaar viewport, niet de hele scrollende
    // pagina — full-page op een lange feed kan 50 MB+ worden vóór
    // compressie en blokkeert de UI seconden lang.
    const resolveColor = createCanvasColorResolver();
    // Eerst stylesheet-rules herschrijven (dekt ::before/::after en !important
    // rules), dan inline-overrides met !important op elk element voor
    // CSS-vars en computed-style residu.
    const restoreSheets = resolveColor ? normalizeStylesheets(document, resolveColor) : () => {};
    const restoreInline = resolveColor
      ? inlineUnsupportedColors(document.documentElement, resolveColor)
      : () => {};
    try {
      const canvas = await html2canvas(document.documentElement, {
        logging: false,
        useCORS: true,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        // Behoud devicePixelRatio default — `scale: 1` geeft blurry tekst
        // op high-DPR displays. Resize-stap hieronder schaalt alsnog terug.
      });
      return resizeAndEncode(canvas);
    } finally {
      restoreInline();
      restoreSheets();
    }
  },
};

function resizeAndEncode(source: HTMLCanvasElement): CaptureResult {
  const scale = Math.min(1, MAX_WIDTH / source.width);
  const targetWidth = Math.round(source.width * scale);
  const targetHeight = Math.round(source.height * scale);

  const target = document.createElement("canvas");
  target.width = targetWidth;
  target.height = targetHeight;
  const ctx = target.getContext("2d");
  if (!ctx) {
    throw new Error("[JAIP screenshot] kon geen 2D context maken");
  }
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  const dataUrl = target.toDataURL("image/jpeg", JPEG_QUALITY);
  return { dataUrl, width: targetWidth, height: targetHeight };
}
