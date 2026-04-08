import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must be set");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate the Google OAuth consent URL for Gmail readonly access.
 */
export function getGoogleAuthUrl(state?: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: state ?? undefined,
  });
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client();
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
