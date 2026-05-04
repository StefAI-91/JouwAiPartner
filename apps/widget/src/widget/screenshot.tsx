import { snapdom } from "@zumer/snapdom";

/**
 * WG-006 lazy screenshot-bundle. Pas geladen wanneer gebruiker op
 * "Screenshot toevoegen" in de modal klikt.
 *
 * Gebruikt `@zumer/snapdom`: SVG `<foreignObject>`-rendering laat de
 * browser zelf renderen (inclusief content-visibility, scroll-containers,
 * transforms, en moderne CSS Color 4 functies). Dat lost de problemen op
 * waar html2canvas en html2canvas-pro op moderne SPAs alleen achtergronden
 * + position:fixed elementen vastlegden.
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
    // Capture documentElement (volledige document) en croppen we daarna
    // naar de huidige viewport — anders zit eventueel scrollbare content
    // mee in het screenshot dat de gebruiker niet zag.
    const result = await snapdom(document.documentElement, {
      exclude: ["#__jaip-widget-host"],
      // "remove" haalt het host-element uit de clone; "hide" houdt layout
      // intact maar verbergt het visueel. We kiezen remove omdat de host
      // op `position: fixed bottom right` staat — verwijderen verandert
      // de layout van andere content niet.
      excludeMode: "remove",
      backgroundColor: "#ffffff",
      fast: true,
      // Lokale fonts worden door de browser zelf gerenderd via foreignObject;
      // remote font-embedding kost extra fetches en blokkeert capture-start.
      embedFonts: false,
    });
    const fullCanvas = await result.toCanvas();
    return resizeAndEncode(cropToViewport(fullCanvas));
  },
};

function cropToViewport(source: HTMLCanvasElement): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;
  const cropX = Math.max(0, Math.round(window.scrollX * dpr));
  const cropY = Math.max(0, Math.round(window.scrollY * dpr));
  const cropW = Math.min(source.width - cropX, Math.round(window.innerWidth * dpr));
  const cropH = Math.min(source.height - cropY, Math.round(window.innerHeight * dpr));
  if (cropW <= 0 || cropH <= 0) return source;

  const target = document.createElement("canvas");
  target.width = cropW;
  target.height = cropH;
  const ctx = target.getContext("2d");
  if (!ctx) return source;
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return target;
}

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
