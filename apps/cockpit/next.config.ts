import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@repo/database", "@repo/ai", "@repo/mcp", "@repo/ui", "@repo/auth"],
  serverExternalPackages: ["cohere-ai"],
  // @repo/ai laadt agent-prompts via readFileSync(import.meta.url,
  // "../../prompts/*.md"). Vercel's NFT zou deze ref normaliter
  // detecteren, maar we tracen ze expliciet zodat de .md-files
  // gegarandeerd mee-deployen — ook bij transpilePackages waar
  // import.meta.url anders kan resolven.
  outputFileTracingIncludes: {
    "/api/ingest/**": ["../../packages/ai/prompts/**/*.md"],
    "/api/cron/**": ["../../packages/ai/prompts/**/*.md"],
    "/api/email/**": ["../../packages/ai/prompts/**/*.md"],
    "/api/management-insights/**": ["../../packages/ai/prompts/**/*.md"],
    "/api/scan-needs/**": ["../../packages/ai/prompts/**/*.md"],
    "/api/webhooks/**": ["../../packages/ai/prompts/**/*.md"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
