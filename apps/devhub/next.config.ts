import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@repo/database", "@repo/ai", "@repo/ui", "@repo/auth"],
  // @repo/ai laadt agent-prompts via readFileSync(import.meta.url,
  // "../../prompts/*.md"). Vercel's NFT zou deze ref normaliter
  // detecteren, maar we tracen ze expliciet zodat de .md-files
  // gegarandeerd mee-deployen — ook bij transpilePackages waar
  // import.meta.url anders kan resolven.
  outputFileTracingIncludes: {
    "/": ["../../packages/ai/prompts/**/*.md"],
    "/issues/**": ["../../packages/ai/prompts/**/*.md"],
    "/api/ingest/**": ["../../packages/ai/prompts/**/*.md"],
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
