/**
 * Email Pre-Classifier — deterministische regels die afzender- en
 * subject-patterns detecteren die onmiskenbaar een notification, newsletter
 * of cold outreach zijn. Draait VÓÓR de AI-classifier om:
 *
 *   1. API-kosten te besparen (skip Haiku call voor zekere gevallen)
 *   2. AI-fouten af te vangen (classifier misidentificeerde Slack/Userback/
 *      SaaS-billing emails als 'administrative' in plaats van 'notification')
 *   3. Deterministisch en uit te leggen te blijven — gebruiker ziet waarom
 *
 * Geeft `null` terug als geen regel matcht — dan neemt de AI-classifier over.
 */

export type PreClassifiedType = "notification" | "newsletter" | "cold_outreach";

export interface PreClassifierOutput {
  email_type: PreClassifiedType;
  matched_rule: string;
}

/** Afzender-patronen die ALTIJD notifications zijn */
const NOTIFICATION_SENDER_PATTERNS: RegExp[] = [
  /^no[-_]?reply@/i,
  /^noreply@/i,
  /^do[-_]?not[-_]?reply@/i,
  /^donotreply@/i,
  /^notifications?@/i,
  /^alerts?@/i,
  /^mailer[-_]?daemon@/i,
  /^postmaster@/i,
  /^bounce@/i,
  /^automated@/i,
  /^system@/i,
];

/** Bekende tool-domeinen die puur notificaties sturen (GitHub, Slack, etc.) */
const NOTIFICATION_DOMAINS: string[] = [
  "slack.com",
  "slackbot.com",
  "userback.io",
  "github.com",
  "githubusercontent.com",
  "vercel.com",
  "netlify.com",
  "supabase.com",
  "supabase.io",
  "stripe.com",
  "calendly.com",
  "google.com", // calendar notifications, docs share
  "gmail.com", // gmail system messages
  "linear.app",
  "notion.so",
  "figma.com",
  "loom.com",
  "zoom.us",
  "anthropic.com", // claude console notifications
  "openai.com",
  "cohere.ai",
  "cohere.com",
  "atlassian.com",
  "clickup.com",
  "asana.com",
  "trello.com",
  "fireflies.ai",
  "adyen.com", // billing/usage summaries
];

/** Subject-patronen die notificaties/newsletters verraden */
const NOTIFICATION_SUBJECT_PATTERNS: RegExp[] = [
  /weekly (usage|summary|digest|report)/i,
  /monthly (usage|summary|digest|report|invoice)/i,
  /your (weekly|monthly|daily) /i,
  /billing cycle/i,
  /payment (received|successful|failed)/i,
  /invoice #?\d/i,
  /you have a new mention/i,
  /new bug created/i,
  /build (succeeded|failed|completed)/i,
  /deploy(ment)? (succeeded|failed|completed|started)/i,
  /pipeline (succeeded|failed)/i,
  /password (reset|changed|wijziging)/i,
  /security alert/i,
  /sign[-_ ]?in from/i,
  /verification code/i,
  /new login/i,
  /^re:\s*\[/i, // ticketing subjects like "re: [CAI] ..."
];

/** Newsletter-specifieke subject-patronen */
const NEWSLETTER_SUBJECT_PATTERNS: RegExp[] = [
  /nieuwsbrief/i,
  /newsletter/i,
  /^\[.*(nieuws|update|digest)\]/i,
  /this week in/i,
  /deze week (in|bij)/i,
];

/** Afzender-patronen voor newsletters (marketing) */
const NEWSLETTER_SENDER_PATTERNS: RegExp[] = [
  /^marketing@/i,
  /^news@/i,
  /^nieuwsbrief@/i,
  /^newsletter@/i,
  /^hello@/i,
  /^hi@/i,
  /^info@/i, // vaak marketing
];

/** Cold outreach body/subject patterns (ongevraagde sales) */
const COLD_OUTREACH_PATTERNS: RegExp[] = [
  /herken(\s+j[ie])? (deze|dit)/i, // "Herken je deze symptomen?"
  /(gratis|vrijblijvend)e? (demo|gesprek|consult|intake)/i,
  /laten we (kennismaken|een kop koffie)/i,
  /quick (question|intro)/i,
  /heeft u (even )?5 minuten/i,
  /ik wil (graag )?(even )?(kort )?(met (u|je) )?(kennismaken|sparren)/i,
  /opvallen in (google|zoekresultaten)/i,
];

/**
 * Haal het domein uit een email-adres.
 * "no-reply@slack.com" → "slack.com"
 */
function extractDomain(email: string): string {
  const atIdx = email.lastIndexOf("@");
  if (atIdx < 0 || atIdx >= email.length - 1) return "";
  return email
    .slice(atIdx + 1)
    .trim()
    .toLowerCase();
}

/**
 * Check of een domein matcht met een van de bekende notification-domeinen.
 * Doet suffix-match zodat subdomeinen ook matchen (e.g. `mailer.slack.com`).
 */
function matchesNotificationDomain(domain: string): string | null {
  const lower = domain.toLowerCase();
  for (const known of NOTIFICATION_DOMAINS) {
    if (lower === known || lower.endsWith(`.${known}`)) {
      return known;
    }
  }
  return null;
}

export function preClassifyEmail(email: {
  subject: string | null;
  from_address: string;
  body_text: string | null;
  snippet: string | null;
}): PreClassifierOutput | null {
  const from = email.from_address.toLowerCase();
  const domain = extractDomain(from);
  const subject = email.subject ?? "";
  const bodyHead = (email.body_text ?? email.snippet ?? "").slice(0, 1000);

  // 1. Notification sender-patterns (no-reply@, notifications@, etc.)
  for (const pattern of NOTIFICATION_SENDER_PATTERNS) {
    if (pattern.test(from)) {
      return {
        email_type: "notification",
        matched_rule: `sender-pattern:${pattern.source}`,
      };
    }
  }

  // 2. Notification by known tool domain
  const matchedDomain = matchesNotificationDomain(domain);
  if (matchedDomain) {
    return {
      email_type: "notification",
      matched_rule: `domain:${matchedDomain}`,
    };
  }

  // 3. Notification by subject pattern
  for (const pattern of NOTIFICATION_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      return {
        email_type: "notification",
        matched_rule: `subject:${pattern.source}`,
      };
    }
  }

  // 4. Newsletter by subject
  for (const pattern of NEWSLETTER_SUBJECT_PATTERNS) {
    if (pattern.test(subject)) {
      return {
        email_type: "newsletter",
        matched_rule: `subject:${pattern.source}`,
      };
    }
  }

  // 5. Newsletter by sender
  for (const pattern of NEWSLETTER_SENDER_PATTERNS) {
    if (pattern.test(from)) {
      return {
        email_type: "newsletter",
        matched_rule: `sender:${pattern.source}`,
      };
    }
  }

  // 6. Cold outreach — marketing body/subject patterns
  for (const pattern of COLD_OUTREACH_PATTERNS) {
    if (pattern.test(subject) || pattern.test(bodyHead)) {
      return {
        email_type: "cold_outreach",
        matched_rule: `coldoutreach:${pattern.source}`,
      };
    }
  }

  return null;
}
