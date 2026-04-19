import {
  runRiskSpecialist,
  RISK_SPECIALIST_PROMPT_VERSION,
  type RiskSpecialistContext,
} from "../../agents/risk-specialist";
import { insertExperimentalRiskExtraction } from "@repo/database/mutations/experimental-risk-extractions";

/**
 * Run the RiskSpecialist-experiment parallel to the MeetingStructurer
 * and persist the result in `experimental_risk_extractions`. Never
 * throws — all failures are captured and stored so the hoofdpipeline
 * never crashes on een experiment-bug.
 *
 * Design keuze: de agent schrijft naar een aparte tabel, de UI blijft
 * op `extractions`. Pas als een A/B-vergelijking op de 6 referentie-
 * meetings laat zien dat Haiku-only-risk beter/goedkoper is, overwegen
 * we een pipeline-switch.
 */
export async function runRiskSpecialistExperiment(
  meetingId: string,
  transcript: string,
  context: RiskSpecialistContext,
): Promise<void> {
  const model = "claude-haiku-4-5-20251001";
  const promptVersion = RISK_SPECIALIST_PROMPT_VERSION;

  try {
    const { output, metrics } = await runRiskSpecialist(transcript, context);
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
    console.info(
      `RiskSpecialist experiment: ${output.risks.length} risks, ${metrics.latency_ms}ms`,
    );
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
