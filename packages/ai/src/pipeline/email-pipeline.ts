import { runEmailClassifier } from "../agents/email-classifier";
import { runEmailExtractor } from "../agents/email-extractor";
import type { EmailClassifierOutput } from "../agents/email-classifier";
import type { EmailExtractorOutput } from "../agents/email-extractor";
import { buildEntityContext } from "./context-injection";
import { resolveOrganization } from "./entity-resolution";
import {
  updateEmailClassification,
  linkEmailProject,
  insertEmailExtractions,
} from "@repo/database/mutations/emails";
import { embedText } from "../embeddings";
import { getAdminClient } from "@repo/database/supabase/admin";

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
  extractor: EmailExtractorOutput | null;
  organization_id: string | null;
  projects_linked: number;
  extractions_saved: number;
  embedded: boolean;
  errors: string[];
}

/**
 * Process a single email through classification and extraction.
 * Same pattern as the meeting gatekeeper-pipeline:
 * 1. Build entity context
 * 2. Classify (relevance, project match, category)
 * 3. Resolve organization
 * 4. Extract insights (only if relevant enough)
 * 5. Save extractions + link projects
 * 6. Embed
 */
export async function processEmail(email: EmailInput): Promise<EmailPipelineResult> {
  const result: EmailPipelineResult = {
    emailId: email.id,
    classifier: null,
    extractor: null,
    organization_id: null,
    projects_linked: 0,
    extractions_saved: 0,
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

  // 3. Resolve organization
  const orgName = result.classifier.organization_name;
  if (orgName) {
    try {
      const orgResult = await resolveOrganization(orgName);
      result.organization_id = orgResult.organization_id;

      await updateEmailClassification(email.id, {
        organization_id: orgResult.organization_id,
        unmatched_organization_name: orgResult.matched ? null : orgName,
        relevance_score: result.classifier.relevance_score,
        email_type: result.classifier.email_category,
        party_type: result.classifier.party_type,
        is_processed: false, // not done yet
      });
    } catch (err) {
      result.errors.push(`Org resolution failed: ${err}`);
    }
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

  // 5. Extract insights (skip low-relevance emails)
  if (
    result.classifier.relevance_score >= 0.4 &&
    result.classifier.email_category !== "newsletter" &&
    result.classifier.email_category !== "notification"
  ) {
    try {
      result.extractor = await runEmailExtractor(
        {
          subject: email.subject,
          from_address: email.from_address,
          from_name: email.from_name,
          to_addresses: email.to_addresses,
          body_text: email.body_text,
          snippet: email.snippet ?? "",
          date: email.date,
        },
        {
          identified_projects: identifiedProjects,
          organization_name: result.classifier.organization_name,
          email_category: result.classifier.email_category,
          entityContext: entityContext.contextString,
        },
      );

      // Save extractions
      if (result.extractor.extractions.length > 0) {
        const rows = result.extractor.extractions.map((ex) => {
          // Match project name to project_id
          let projectId: string | null = null;
          if (ex.project) {
            const matched = identifiedProjects.find(
              (p) => p.project_name.toLowerCase() === ex.project!.toLowerCase(),
            );
            if (matched?.project_id) projectId = matched.project_id;
          }

          return {
            email_id: email.id,
            type: ex.type,
            content: ex.content,
            confidence: ex.confidence,
            source_ref: ex.source_ref,
            metadata: {
              assignee: ex.assignee,
              urgency: ex.urgency,
              project_name: ex.project,
            },
            project_id: projectId,
            embedding_stale: true,
            verification_status: "draft" as const,
          };
        });

        const insertResult = await insertEmailExtractions(rows);
        if ("error" in insertResult) {
          result.errors.push(`Extraction insert failed: ${insertResult.error}`);
        } else {
          result.extractions_saved = insertResult.count;
        }
      }
    } catch (err) {
      result.errors.push(`Extraction failed: ${err}`);
    }
  }

  // 6. Mark as processed + embed
  try {
    await updateEmailClassification(email.id, {
      organization_id: result.organization_id,
      unmatched_organization_name: orgName && !result.organization_id ? orgName : null,
      relevance_score: result.classifier.relevance_score,
      email_type: result.classifier.email_category,
      party_type: result.classifier.party_type,
      is_processed: true,
    });
  } catch (err) {
    result.errors.push(`Update classification failed: ${err}`);
  }

  // 7. Embed the email
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
