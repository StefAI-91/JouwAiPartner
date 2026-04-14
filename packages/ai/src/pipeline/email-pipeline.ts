import { runEmailClassifier } from "../agents/email-classifier";
import type { EmailClassifierOutput } from "../agents/email-classifier";
import { buildEntityContext } from "./context-injection";
import { resolveOrganization } from "./entity-resolution";
import {
  updateEmailClassification,
  updateEmailSenderPerson,
  linkEmailProject,
} from "@repo/database/mutations/emails";
import { findPersonOrgByEmail } from "@repo/database/queries/people";
import { findOrganizationIdByEmailDomain } from "@repo/database/queries/organizations";
import { embedText } from "../embeddings";
import { getAdminClient } from "@repo/database/supabase/admin";

/**
 * Resolve een e-mail naar een organisatie én (waar mogelijk) een bekende
 * afzender-person. Probeert drie strategieën in prioriteitsvolgorde:
 *
 *   1. Classifier organisatienaam → resolveOrganization (bestaande naam/alias match)
 *   2. from_address → findPersonOrgByEmail → people.organization_id
 *   3. from_address domein → findOrganizationIdByEmailDomain
 *
 * Eerste match wint. `unmatched_organization_name` wordt alleen gezet als de
 * classifier een organisatienaam uit de tekst haalde maar géén van de drie
 * strategieën een organisatie opleverde — voor debugging en review.
 */
export interface EmailOrganizationResolution {
  organization_id: string | null;
  unmatched_organization_name: string | null;
  sender_person_id: string | null;
  match_source: "classifier" | "person" | "domain" | "none";
  errors: string[];
}

export async function resolveEmailOrganization(
  fromAddress: string,
  classifierOrgName: string | null,
): Promise<EmailOrganizationResolution> {
  const result: EmailOrganizationResolution = {
    organization_id: null,
    unmatched_organization_name: null,
    sender_person_id: null,
    match_source: "none",
    errors: [],
  };

  // Strategy 1: classifier organisatienaam
  if (classifierOrgName) {
    try {
      const orgResult = await resolveOrganization(classifierOrgName);
      if (orgResult.matched && orgResult.organization_id) {
        result.organization_id = orgResult.organization_id;
        result.match_source = "classifier";
      }
    } catch (err) {
      // Errors van strategy 1 worden gelogd zodat ze voor debugging te zien
      // zijn, maar fataal zijn ze niet — strategy 2 en 3 krijgen alsnog een
      // kans om een match te vinden.
      result.errors.push(`Org resolution failed: ${err}`);
    }
  }

  // Strategy 2: sender-person lookup (ook als we al een org-match hebben, voor sender_person_id)
  const senderMatch = await findPersonOrgByEmail(fromAddress).catch(() => null);
  if (senderMatch) {
    result.sender_person_id = senderMatch.personId;
    if (result.organization_id === null && senderMatch.organizationId) {
      result.organization_id = senderMatch.organizationId;
      result.match_source = "person";
    }
  }

  // Strategy 3: domein-fallback
  if (result.organization_id === null) {
    const atIdx = fromAddress.lastIndexOf("@");
    if (atIdx > 0 && atIdx < fromAddress.length - 1) {
      const domain = fromAddress
        .slice(atIdx + 1)
        .trim()
        .toLowerCase();
      if (domain) {
        const orgId = await findOrganizationIdByEmailDomain(domain).catch(() => null);
        if (orgId) {
          result.organization_id = orgId;
          result.match_source = "domain";
        }
      }
    }
  }

  // Unmatched orgname alleen zetten als classifier wél een naam gaf maar niks matchte
  if (classifierOrgName && result.match_source === "none") {
    result.unmatched_organization_name = classifierOrgName;
  } else if (classifierOrgName && result.match_source !== "classifier") {
    // Classifier had een naam, maar we hebben gematcht via andere strategie —
    // toch een unmatched_organization_name bewaren? Nee: we zijn zeker, vlag weg.
    result.unmatched_organization_name = null;
  }

  return result;
}

interface EmailInput {
  id: string;
  subject: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  date: string;
  body_text: string | null;
  snippet: string | null;
}

interface EmailPipelineResult {
  emailId: string;
  classifier: EmailClassifierOutput | null;
  organization_id: string | null;
  projects_linked: number;
  embedded: boolean;
  errors: string[];
}

/**
 * Process a single email: classify + link entities. AI extraction of
 * decisions, action items, needs and insights is intentionally disabled
 * for e-mails — we only want classification and entity linking.
 *
 * Steps:
 * 1. Build entity context
 * 2. Classify (relevance, project match, category)
 * 3. Resolve organization + match sender person
 * 4. Link identified projects
 * 5. Mark processed + embed
 */
export async function processEmail(email: EmailInput): Promise<EmailPipelineResult> {
  const result: EmailPipelineResult = {
    emailId: email.id,
    classifier: null,
    organization_id: null,
    projects_linked: 0,
    embedded: false,
    errors: [],
  };

  // 1. Build entity context (projects, orgs, people from DB)
  let entityContext;
  try {
    entityContext = await buildEntityContext();
  } catch (err) {
    result.errors.push(`Entity context failed: ${err}`);
    entityContext = { projects: [], contextString: "" };
  }

  // 2. Classify email
  try {
    result.classifier = await runEmailClassifier(
      {
        subject: email.subject,
        from_address: email.from_address,
        from_name: email.from_name,
        to_addresses: email.to_addresses,
        body_text: email.body_text,
        snippet: email.snippet ?? "",
        date: email.date,
      },
      { entityContext: entityContext.contextString },
    );
  } catch (err) {
    result.errors.push(`Classification failed: ${err}`);
    // Mark as processed even if classification fails — avoid retry loops
    await updateEmailClassification(email.id, {
      organization_id: null,
      unmatched_organization_name: null,
      relevance_score: 0,
      email_type: null,
      party_type: null,
      is_processed: true,
    });
    return result;
  }

  // 3. Resolve organization + sender (3-stage matching: classifier → person → domain)
  const orgName = result.classifier.organization_name;
  let orgResolution: EmailOrganizationResolution;
  try {
    orgResolution = await resolveEmailOrganization(email.from_address, orgName);
    result.organization_id = orgResolution.organization_id;
    if (orgResolution.errors.length > 0) {
      result.errors.push(...orgResolution.errors);
    }

    // Save sender person as soon as we find one — survives pipeline errors later
    if (orgResolution.sender_person_id) {
      await updateEmailSenderPerson(email.id, orgResolution.sender_person_id);
    }

    // Intermediate persist — as before, safe against downstream failure
    await updateEmailClassification(email.id, {
      organization_id: orgResolution.organization_id,
      unmatched_organization_name: orgResolution.unmatched_organization_name,
      relevance_score: result.classifier.relevance_score,
      email_type: result.classifier.email_type,
      party_type: result.classifier.party_type,
      is_processed: false, // not done yet
    });
  } catch (err) {
    result.errors.push(`Org resolution failed: ${err}`);
    orgResolution = {
      organization_id: null,
      unmatched_organization_name: orgName,
      sender_person_id: null,
      match_source: "none",
      errors: [],
    };
  }

  // 4. Link identified projects
  const identifiedProjects = result.classifier.identified_projects ?? [];
  for (const project of identifiedProjects) {
    if (!project.project_id) continue;
    // Also try to match by name against entity context
    const matchedProject = entityContext.projects.find((p) => p.id === project.project_id);
    if (matchedProject) {
      try {
        await linkEmailProject(email.id, matchedProject.id, "ai");
        result.projects_linked++;
      } catch (err) {
        result.errors.push(`Project link failed: ${err}`);
      }
    }
  }

  // 5. Mark as processed + embed (AI extraction intentionally disabled)
  try {
    await updateEmailClassification(email.id, {
      organization_id: result.organization_id,
      unmatched_organization_name: orgResolution.unmatched_organization_name,
      relevance_score: result.classifier.relevance_score,
      email_type: result.classifier.email_type,
      party_type: result.classifier.party_type,
      is_processed: true,
    });
  } catch (err) {
    result.errors.push(`Update classification failed: ${err}`);
  }

  // 6. Embed the email
  try {
    const textToEmbed = [email.subject, email.body_text ?? email.snippet]
      .filter(Boolean)
      .join("\n\n");
    if (textToEmbed.length > 20) {
      const embedding = await embedText(textToEmbed);
      if (embedding) {
        await getAdminClient()
          .from("emails")
          .update({ embedding: JSON.stringify(embedding), embedding_stale: false })
          .eq("id", email.id);
        result.embedded = true;
      }
    }
  } catch (err) {
    result.errors.push(`Embedding failed: ${err}`);
  }

  return result;
}

/**
 * Process a batch of unprocessed emails.
 */
export async function processEmailBatch(emails: EmailInput[]): Promise<EmailPipelineResult[]> {
  const results: EmailPipelineResult[] = [];

  for (const email of emails) {
    const result = await processEmail(email);
    results.push(result);
  }

  return results;
}
