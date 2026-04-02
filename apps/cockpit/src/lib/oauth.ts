import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { timingSafeEqual } from "crypto";

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

// ── In-memory client registry ──
// WARNING: Dynamic registrations are NOT persisted across serverless cold starts.
// This is acceptable for the current MCP use case where clients re-register on
// connection setup. For persistent clients, migrate to a Supabase `oauth_clients` table.
const REGISTERED_CLIENTS = new Map<
  string,
  { clientId: string; redirectUris: string[]; name: string }
>();

// ── Auth code helpers (JWT-based, serverless-safe) ───────────
// Auth codes are self-contained signed JWTs so they survive across
// Vercel serverless invocations (no shared memory between /authorize and /token).

export async function storeAuthCode(
  _code: string,
  data: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    userId: string;
  },
): Promise<string> {
  return new SignJWT({
    type: "auth_code",
    client_id: data.clientId,
    redirect_uri: data.redirectUri,
    code_challenge: data.codeChallenge,
    sub: data.userId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .setIssuer("jouwaipartner")
    .sign(getSigningKey());
}

export async function consumeAuthCode(code: string) {
  try {
    const { payload } = await jwtVerify(code, getSigningKey(), {
      issuer: "jouwaipartner",
    });
    if (payload.type !== "auth_code") return null;
    return {
      clientId: payload.client_id as string,
      redirectUri: payload.redirect_uri as string,
      codeChallenge: payload.code_challenge as string,
      userId: payload.sub as string,
    };
  } catch {
    return null;
  }
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
  console.warn(
    `[oauth] Client "${data.name}" registered in-memory (clientId: ${clientId}). Will not survive cold start.`,
  );
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
  if (base64url.length !== codeChallenge.length) return false;
  return timingSafeEqual(Buffer.from(base64url), Buffer.from(codeChallenge));
}

// ── Issuer URL ───────────────────────────────────────────────
export function getIssuerUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  return url.startsWith("http") ? url : `https://${url}`;
}
