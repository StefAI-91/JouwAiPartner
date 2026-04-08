import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const uri = redirectUri ?? process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new google.auth.OAuth2(clientId, clientSecret, uri);
}

/**
 * Generate the Google OAuth consent URL for Gmail readonly access.
 * Accepts a dynamic redirectUri so it works on any Vercel preview deployment.
 */
export function getGoogleAuthUrl(redirectUri: string, state?: string): string {
  const client = getOAuth2Client(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: state ?? undefined,
  });
}

/**
 * Exchange an authorization code for tokens.
 * Must use the same redirectUri that was used to generate the auth URL.
 */
export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const client = getOAuth2Client(redirectUri);
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to obtain tokens from Google");
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date ?? Date.now() + 3600 * 1000,
    scope: tokens.scope ?? SCOPES.join(" "),
  };
}

/**
 * Create an authenticated OAuth2 client from stored tokens.
 * Handles token refresh automatically.
 */
export function createAuthenticatedClient(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}) {
  const client = getOAuth2Client();
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });
  return client;
}

/**
 * Get the email address of the authenticated user.
 */
export async function getAuthenticatedEmail(accessToken: string): Promise<string> {
  const client = getOAuth2Client();
  client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data.emailAddress ?? "";
}
