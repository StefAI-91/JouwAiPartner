import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  minify: true,
  sourcemap: true,
  target: "es2020",
  // Preact-compat alias (~30KB kleiner gzip dan React 19 + ReactDOM, identieke
  // API voor onze use-case: useState, useEffect, JSX, geen Suspense/streaming).
  // Code blijft `import { useState } from "react"` schrijven — esbuild aliassed.
  alias: {
    react: "preact/compat",
    "react-dom": "preact/compat",
    "react/jsx-runtime": "preact/jsx-runtime",
    "react-dom/test-utils": "preact/test-utils",
  },
  logLevel: "info",
};

const builds = [
  {
    ...common,
    entryPoints: ["src/loader/index.ts"],
    outfile: "public/loader.js",
    format: "iife",
  },
  {
    ...common,
    entryPoints: ["src/widget/index.tsx"],
    outfile: "public/widget.js",
    format: "iife",
    globalName: "__JAIPWidget",
    jsx: "automatic",
    jsxImportSource: "preact",
  },
];

if (watch) {
  for (const config of builds) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
  }
  console.log("[widget] watching for changes…");
} else {
  for (const config of builds) {
    await esbuild.build(config);
  }
}
