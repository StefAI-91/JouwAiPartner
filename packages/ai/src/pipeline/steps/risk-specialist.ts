import {
  runRiskSpecialist,
  RISK_SPECIALIST_MODEL,
  RISK_SPECIALIST_PROMPT_VERSION,
  type RiskSpecialistContext,
} from "../../agents/risk-specialist";
import { insertExperimentalRiskExtraction } from "@repo/database/mutations/extractions/experimental-risks";
import { saveRiskExtractions } from "../saves/risk-extractions";
import type { IdentifiedProject } from "../../validations/gatekeeper";

/**
 * Productie-step voor de RiskSpecialist. Persisteert de output op twee
 * plekken, elk met een eigen verantwoordelijkheid:
 *
 *  1. `extractions` (type='risk') — de risico's zoals de UI/review-flow ze
 *     ziet. Idempotent per meeting via `saveRiskExtractions` (replace op
 *     type='risk' — action_items en andere types blijven staan).
 *
 *  2. `experimental_risk_extractions` — append-only run-telemetrie: model,
 *     prompt_version, latency, token-counts, error. Ooit gebouwd als A/B-
 *     tabel; nu gebruikt als audit-laag voor cost-analyse, prompt-drift en
 *     failure-tracking zonder de productie-rijen te vervuilen. Tabelnaam
 *     is bewust niet herdoopt — dat zou een migratie kosten zonder
 *     functioneel winstpunt.
 *
 * Never throws: iedere persist-stap faalt onafhankelijk en wordt opgelogd.
 * Bij een agent-crash wordt een error-rij geschreven naar de telemetrie-
 * tabel zodat je "did it fail?" kunt onderscheiden van "did it not run?".
 */
export async function runRiskSpecialistStep(
  meetingId: string,
  transcript: string,
  context: RiskSpecialistContext,
  identifiedProjects: IdentifiedProject[],
): Promise<void> {
  const model = RISK_SPECIALIST_MODEL;
  const promptVersion = RISK_SPECIALIST_PROMPT_VERSION;

  try {
    const { output, metrics } = await runRiskSpecialist(transcript, context);

    // Run-telemetrie: latency / tokens / prompt-versie. Mag falen zonder
    // de productie-save te blokkeren.
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
    } catch (telemetryErr) {
      console.error(
        "RiskSpecialist telemetry-save failed (non-blocking):",
        telemetryErr instanceof Error ? telemetryErr.message : String(telemetryErr),
      );
    }

    // Productie-save: risks naar de gedeelde extractions-tabel zodat ze in
    // de UI en review-flow verschijnen. Idempotent per type.
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
    console.error("RiskSpecialist agent failed (non-blocking):", errMsg);
    // Schrijf een error-rij naar de telemetrie zodat "did it fail?"
    // onderscheidbaar blijft van "did it not run?".
    try {
      await insertExperimentalRiskExtraction({
        meeting_id: meetingId,
        model,
        prompt_version: promptVersion,
        risks: [],
        error: errMsg,
      });
    } catch (saveErr) {
      console.error(
        "Failed to record RiskSpecialist failure row:",
        saveErr instanceof Error ? saveErr.message : String(saveErr),
      );
    }
  }
}
