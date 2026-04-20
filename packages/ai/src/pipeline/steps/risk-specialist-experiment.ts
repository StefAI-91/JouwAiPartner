import {
  runRiskSpecialist,
  RISK_SPECIALIST_MODEL,
  RISK_SPECIALIST_PROMPT_VERSION,
  type RiskSpecialistContext,
} from "../../agents/risk-specialist";
import { insertExperimentalRiskExtraction } from "@repo/database/mutations/experimental-risk-extractions";
import { saveRiskExtractions } from "../save-risk-extractions";
import type { IdentifiedProject } from "../../validations/gatekeeper";

/**
 * Run the RiskSpecialist parallel to the summarizer/extractor and persist
 * de output op TWEE plekken:
 *
 *  1. `extractions` (type='risk') — zichtbaar in de review-flow + meeting-
 *     detail UI via `saveRiskExtractions()`.
 *  2. `experimental_risk_extractions` — audit-telemetrie (model, prompt-
 *     versie, latency, tokens) voor kostprijs-analyse en A/B-vergelijking
 *     tussen prompt-versies.
 *
 * Never throws — alle fouten worden gevangen en (indien mogelijk) als
 * error-rij opgeslagen zodat een specialist-crash de hoofdpipeline nooit
 * afbreekt. Elk van de 2 persist-stappen faalt onafhankelijk: de ene
 * hoeft niet te slagen voor de andere.
 */
export async function runRiskSpecialistExperiment(
  meetingId: string,
  transcript: string,
  context: RiskSpecialistContext,
  identifiedProjects: IdentifiedProject[],
): Promise<void> {
  const model = RISK_SPECIALIST_MODEL;
  const promptVersion = RISK_SPECIALIST_PROMPT_VERSION;

  try {
    const { output, metrics } = await runRiskSpecialist(transcript, context);

    // Audit-rij (telemetrie). Failure hier mag de extractions-save niet blokkeren.
    try {
      await insertExperimentalRiskExtraction({
        meeting_id: meetingId,
        model,
        prompt_version: promptVersion,
        risks: output.risks,
        latency_ms: metrics.latency_ms,
        input_tokens: metrics.input_tokens,
        output_tokens: metrics.output_tokens,
        reasoning_tokens: metrics.reasoning_tokens,
        error: null,
      });
    } catch (auditErr) {
      console.error(
        "RiskSpecialist audit-save failed (non-blocking):",
        auditErr instanceof Error ? auditErr.message : String(auditErr),
      );
    }

    // Productie-pad: schrijf risks naar de gedeelde extractions-tabel zodat
    // de UI/review-flow ze ziet. Idempotent per meeting (replace op type=risk).
    try {
      const saveResult = await saveRiskExtractions(output, meetingId, identifiedProjects);
      console.info(
        `RiskSpecialist: ${saveResult.extractions_saved} risks saved to extractions, ${metrics.latency_ms}ms`,
      );
    } catch (saveErr) {
      console.error(
        "RiskSpecialist save to extractions failed (non-blocking):",
        saveErr instanceof Error ? saveErr.message : String(saveErr),
      );
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("RiskSpecialist experiment failed (non-blocking):", errMsg);
    // Save the failure so missing rows are never "did it not run?" vs "did it fail?".
    try {
      await insertExperimentalRiskExtraction({
        meeting_id: meetingId,
        model,
        prompt_version: promptVersion,
        risks: [],
        error: errMsg,
      });
    } catch (saveErr) {
      // Double-fault: swallow. The pipeline must continue.
      console.error(
        "Failed to record RiskSpecialist failure row:",
        saveErr instanceof Error ? saveErr.message : String(saveErr),
      );
    }
  }
}
