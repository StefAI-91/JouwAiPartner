import { google, gmail_v1 } from "googleapis";
import { createAuthenticatedClient } from "./google-oauth";

export interface GmailMessage {
  gmail_id: string;
  thread_id: string;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  date: string;
  body_text: string | null;
  body_html: string | null;
  snippet: string;
  labels: string[];
  has_attachments: boolean;
  raw_gmail: Record<string, unknown>;
}

/**
 * Parse an email address header like "Name <email@domain.com>" or plain "email@domain.com".
 */
function parseEmailHeader(header: string): { name: string | null; address: string } {
  const match = header.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, "").trim(), address: match[2].trim() };
  }
  return { name: null, address: header.trim() };
}

/**
 * Parse a list of email addresses from a header value (comma-separated).
 */
function parseAddressList(header: string | undefined | null): string[] {
  if (!header) return [];
  return header.split(",").map((addr) => parseEmailHeader(addr.trim()).address);
}

/**
 * Decode base64url-encoded content from Gmail API.
 */
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Extract the body text and HTML from a Gmail message payload.
 */
function extractBody(payload: gmail_v1.Schema$MessagePart): {
  text: string | null;
  html: string | null;
} {
  let text: string | null = null;
  let html: string | null = null;

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    text = decodeBase64Url(payload.body.data);
  } else if (payload.mimeType === "text/html" && payload.body?.data) {
    html = decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested.text && !text) text = nested.text;
      if (nested.html && !html) html = nested.html;
    }
  }

  return { text, html };
}

/**
 * Get a header value from a Gmail message payload.
 */
function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string | null {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null;
}

/**
 * Parse a raw Gmail API message into our normalized format.
 */
function parseGmailMessage(message: gmail_v1.Schema$Message): GmailMessage {
  const headers = message.payload?.headers;
  const fromRaw = getHeader(headers, "From") ?? "";
  const parsed = parseEmailHeader(fromRaw);
  const { text, html } = extractBody(message.payload ?? {});

  const hasAttachments =
    message.payload?.parts?.some(
      (p) => p.filename && p.filename.length > 0 && p.body?.attachmentId,
    ) ?? false;

  return {
    gmail_id: message.id ?? "",
    thread_id: message.threadId ?? "",
    subject: getHeader(headers, "Subject"),
    from_address: parsed.address,
    from_name: parsed.name,
    to_addresses: parseAddressList(getHeader(headers, "To")),
    cc_addresses: parseAddressList(getHeader(headers, "Cc")),
    date: new Date(Number(message.internalDate) || 0).toISOString(),
    body_text: text,
    body_html: html,
    snippet: message.snippet ?? "",
    labels: message.labelIds ?? [],
    has_attachments: hasAttachments,
    raw_gmail: message as unknown as Record<string, unknown>,
  };
}

/**
 * Fetch recent emails from a Gmail account.
 * Uses stored OAuth tokens for authentication.
 */
export async function fetchEmails(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  options: {
    maxResults?: number;
    query?: string;
    afterDate?: string;
  } = {},
): Promise<{
  messages: GmailMessage[];
  newTokens?: { access_token: string; expiry_date: number };
}> {
  const client = createAuthenticatedClient(tokens);
  const gmail = google.gmail({ version: "v1", auth: client });

  // Build query: default to non-draft, non-spam
  let q = options.query ?? "in:inbox -category:promotions -category:social";
  if (options.afterDate) {
    q += ` after:${options.afterDate}`;
  }

  // List message IDs
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults: options.maxResults ?? 50,
    q,
  });

  const messageIds = listResponse.data.messages ?? [];
  if (messageIds.length === 0) {
    return { messages: [] };
  }

  // Fetch full message details (batch)
  const messages: GmailMessage[] = [];
  for (const { id } of messageIds) {
    if (!id) continue;
    const msg = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    messages.push(parseGmailMessage(msg.data));
  }

  // Check if tokens were refreshed
  const credentials = client.credentials;
  const newTokens =
    credentials.access_token !== tokens.access_token
      ? {
          access_token: credentials.access_token!,
          expiry_date: credentials.expiry_date ?? Date.now() + 3600 * 1000,
        }
      : undefined;

  return { messages, newTokens };
}

/**
 * Fetch a single email by Gmail ID.
 */
export async function fetchEmailById(
  tokens: { access_token: string; refresh_token: string; expiry_date: number },
  gmailId: string,
): Promise<GmailMessage | null> {
  const client = createAuthenticatedClient(tokens);
  const gmail = google.gmail({ version: "v1", auth: client });

  try {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: gmailId,
      format: "full",
    });
    return parseGmailMessage(msg.data);
  } catch {
    return null;
  }
}
