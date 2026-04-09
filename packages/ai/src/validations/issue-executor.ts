import { z } from "zod";

export const ExecutionStepSchema = z.object({
  step: z.number().describe("Stapnummer (1, 2, 3...)"),
  title: z.string().describe("Korte titel van de stap"),
  description: z.string().describe("Wat er in deze stap gedaan wordt"),
  status: z.enum(["pending", "in_progress", "done"]).describe("Status van de stap"),
  estimated_minutes: z.number().describe("Geschatte duur in minuten (1-60)"),
});

export const IssueExecutorSchema = z.object({
  analysis: z
    .string()
    .describe("Korte analyse van het issue: wat is het probleem en wat is de oorzaak (2-3 zinnen)"),
  approach: z.string().describe("De gekozen aanpak om dit issue op te lossen (1-2 zinnen)"),
  steps: z
    .array(ExecutionStepSchema)
    .describe("Concrete stappen om het issue op te lossen (3-6 stappen)"),
  estimated_total_minutes: z.number().describe("Totale geschatte doorlooptijd in minuten"),
  complexity: z.enum(["low", "medium", "high"]).describe("Complexiteit van de fix"),
  affected_files: z
    .array(z.string())
    .describe("Bestanden/componenten die waarschijnlijk aangepast moeten worden"),
});

export type IssueExecutorOutput = z.infer<typeof IssueExecutorSchema>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
