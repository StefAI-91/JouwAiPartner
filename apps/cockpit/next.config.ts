import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@repo/database", "@repo/ai", "@repo/mcp", "@repo/ui", "@repo/auth"],
  serverExternalPackages: ["cohere-ai"],
  // @repo/ai laadt agent-prompts via readFileSync(import.meta.url, "../../prompts/*.md").
  // Zonder deze trace crasht module-load van elke serverless functie die een agent
  // importeert met ENOENT: /var/task/packages/ai/prompts/<naam>.md. De eerdere
  // route-specifieke lijst (alleen /api/ingest, /api/cron, etc.) miste Server Actions
  // en page-routes die ook AI-agents gebruiken (zoals /review met verifyMeeting die
  // downstream de pipeline kan triggeren). Breder `/**/*` dekt alles.
  outputFileTracingIncludes: {
    "/**/*": ["../../packages/ai/prompts/**/*.md"],
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
