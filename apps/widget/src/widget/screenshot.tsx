import html2canvas from "html2canvas-pro";

/**
 * WG-006 lazy screenshot-bundle. Pas geladen wanneer gebruiker op
 * "Screenshot toevoegen" in de modal klikt — html2canvas-pro zit hier in
 * een aparte bundle (~50 KB gzip) zodat baseline `widget.js` klein blijft
 * (~12 KB gzip) voor mensen die het niet gebruiken.
 *
 * `html2canvas-pro` is een fork van `niklasvh/html2canvas` met native
 * support voor CSS Color 4 functies (oklab/oklch/lab/lch/hwb/color()) —
 * Tailwind v4 default oklch werkte daardoor niet op de originele lib.
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
    const canvas = await html2canvas(document.documentElement, {
      logging: false,
      useCORS: true,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      // Sluit de widget-host (knop + open modal) uit van de capture; anders
      // staat de feedback-modal zelf op de screenshot. html2canvas-pro
      // walkt shadow DOM, dus zonder dit zie je het hele formulier terug.
      ignoreElements: (el) => el.id === "__jaip-widget-host",
      // Moderne sites gebruiken `content-visibility: auto` en `contain: paint`
      // voor scroll-perf — html2canvas's iframe-clone telt dat als off-screen
      // en slaat de inhoud over (alleen achtergronden + position:fixed elementen
      // worden gerenderd). Forceer alle elementen naar visible/contain:none in
      // de clone, en eager-load lazy images zodat hun src tijdig binnen is.
      onclone: (clonedDoc) => {
        const overrideStyle = clonedDoc.createElement("style");
        overrideStyle.textContent = `
          *, *::before, *::after {
            content-visibility: visible !important;
            contain: none !important;
          }
        `;
        clonedDoc.head.appendChild(overrideStyle);
        clonedDoc.querySelectorAll("img[loading='lazy']").forEach((img) => {
          (img as HTMLImageElement).loading = "eager";
        });
      },
      // Behoud devicePixelRatio default — `scale: 1` geeft blurry tekst
      // op high-DPR displays. Resize-stap hieronder schaalt alsnog terug.
    });
    return resizeAndEncode(canvas);
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
