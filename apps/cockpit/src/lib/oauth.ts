import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// ── Signing key ──────────────────────────────────────────────
// Derived from OAUTH_SECRET env var (must be ≥32 chars).
// Falls back to CRON_SECRET for convenience in dev.
function getSigningKey(): Uint8Array {
  const secret = process.env.OAUTH_SECRET ?? process.env.CRON_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("OAUTH_SECRET (or CRON_SECRET ≥32 chars) is required");
  }
  return new TextEncoder().encode(secret);
}

// ── In-memory stores (serverless-safe via Supabase in production) ──
// For v1 we keep auth codes + registered clients in memory.
// On Vercel each invocation is short-lived, so we use a KV-like
// approach with expiry baked into the JWT itself.

const AUTH_CODES = new Map<
  string,
  {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    userId: string;
    expiresAt: number;
  }
>();

const REGISTERED_CLIENTS = new Map<
  string,
  { clientId: string; redirectUris: string[]; name: string }
>();

// ── Auth code helpers ────────────────────────────────────────
export function storeAuthCode(
  code: string,
  data: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    userId: string;
  },
) {
  AUTH_CODES.set(code, { ...data, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min
}

export function consumeAuthCode(code: string) {
  const entry = AUTH_CODES.get(code);
  if (!entry) return null;
  AUTH_CODES.delete(code);
  if (Date.now() > entry.expiresAt) return null;
  return entry;
}

// ── Client registration helpers ──────────────────────────────
export function registerClient(data: {
  redirectUris: string[];
  name: string;
}) {
  const clientId = crypto.randomUUID();
  REGISTERED_CLIENTS.set(clientId, {
    clientId,
    redirectUris: data.redirectUris,
    name: data.name,
  });
  return { clientId };
}

export function getClient(clientId: string) {
  return REGISTERED_CLIENTS.get(clientId) ?? null;
}

// ── JWT helpers ──────────────────────────────────────────────
export interface McpTokenPayload extends JWTPayload {
  sub: string; // Supabase user ID
  scope: string;
  client_id: string;
}

export async function signAccessToken(payload: {
  userId: string;
  clientId: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    scope: "mcp",
    client_id: payload.clientId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .setIssuer("jouwaipartner")
    .sign(getSigningKey());
}

export async function verifyAccessToken(
  token: string,
): Promise<McpTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey(), {
      issuer: "jouwaipartner",
    });
    return payload as McpTokenPayload;
  } catch {
    return null;
  }
}

// ── PKCE helper ──────────────────────────────────────────────
export async function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(codeVerifier));
  const base64url = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return base64url === codeChallenge;
}

// ── Issuer URL ───────────────────────────────────────────────
export function getIssuerUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  return url.startsWith("http") ? url : `https://${url}`;
}
