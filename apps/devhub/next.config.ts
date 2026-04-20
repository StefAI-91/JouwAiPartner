import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@repo/database", "@repo/ai", "@repo/ui", "@repo/auth"],
  // @repo/ai laadt agent-prompts via readFileSync(import.meta.url, "../../prompts/*.md").
  // Zonder deze trace crasht module-load van elke serverless functie die een agent
  // importeert met ENOENT: /var/task/packages/ai/prompts/<naam>.md.
  // Breder `/**/*` (ipv route-specifieke lijst) dekt ook Server Actions en toekomstige
  // routes die agents gebruiken zonder dat er telkens een entry bij moet.
  outputFileTracingIncludes: {
    "/**/*": ["../../packages/ai/prompts/**/*.md"],
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
