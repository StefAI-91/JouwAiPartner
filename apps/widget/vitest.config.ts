import { defineConfig } from "vitest/config";

/**
 * WG-007 — minimale vitest setup voor de widget-bundle-binding regression-test.
 * jsdom geeft ons een echte window+document zodat we widget.js kunnen
 * evalueren en `window.__JAIPWidget` kunnen asserteren.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts"],
  },
});
