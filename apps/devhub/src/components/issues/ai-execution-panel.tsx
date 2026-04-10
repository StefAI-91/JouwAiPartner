"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, Circle, Loader2, Clock, FileCode, Brain, Zap } from "lucide-react";
import { cn } from "@repo/ui/utils";

interface ExecutionStep {
  step: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "done";
  estimated_minutes: number;
}

interface AiContext {
  analysis: string;
  approach: string;
  complexity: string;
  affected_files: string[];
  estimated_total_minutes: number;
}

interface AiResult {
  steps: ExecutionStep[];
  started_at: string;
  current_step: number;
  status: "executing" | "completed";
  completed_at?: string;
}

interface AiExecutionPanelProps {
  aiContext: AiContext | null;
  aiResult: AiResult | null;
  executionType: string;
}

const COMPLEXITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Laag", color: "text-emerald-700", bg: "bg-emerald-50" },
  medium: { label: "Medium", color: "text-amber-700", bg: "bg-amber-50" },
  high: { label: "Hoog", color: "text-red-700", bg: "bg-red-50" },
};

function StepIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 className="size-5 text-emerald-500" />;
  if (status === "in_progress") return <Loader2 className="size-5 text-blue-500 animate-spin" />;
  return <Circle className="size-5 text-muted-foreground/30" />;
}

export function AiExecutionPanel({ aiContext, aiResult, executionType }: AiExecutionPanelProps) {
  const router = useRouter();

  // Poll for updates only while actively executing
  useEffect(() => {
    if (aiResult?.status !== "executing") return;
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [aiResult?.status, router]);

  if (executionType !== "ai" || (!aiContext && !aiResult)) return null;

  const isExecuting = aiResult?.status === "executing";
  const isCompleted = aiResult?.status === "completed";
  const completedSteps = aiResult?.steps.filter((s) => s.status === "done").length ?? 0;
  const totalSteps = aiResult?.steps.length ?? 0;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const complexity = aiContext?.complexity ? COMPLEXITY_CONFIG[aiContext.complexity] : null;

  return (
    <section className="mb-6">
      <div className="rounded-lg border border-blue-200 bg-gradient-to-b from-blue-50/50 to-background overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-blue-100 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-100 p-1.5">
              <Bot className="size-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Developer Agent</h2>
              <p className="text-sm text-muted-foreground">
                {isExecuting
                  ? "Bezig met uitvoeren..."
                  : isCompleted
                    ? "Uitvoering voltooid"
                    : "Plan gegenereerd"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {complexity && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium",
                  complexity.bg,
                  complexity.color,
                )}
              >
                {complexity.label}
              </span>
            )}
            {aiContext?.estimated_total_minutes && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="size-3.5" />~{aiContext.estimated_total_minutes} min
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {aiResult && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Voortgang</span>
              <span className="font-medium">
                {completedSteps}/{totalSteps} stappen
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isCompleted ? "bg-emerald-500" : "bg-blue-500",
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Analysis */}
        {aiContext && (
          <div className="px-5 pt-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <Brain className="size-4 text-violet-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Analyse</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {aiContext.analysis}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Zap className="size-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Aanpak</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {aiContext.approach}
                </p>
              </div>
            </div>
            {aiContext.affected_files.length > 0 && (
              <div className="flex items-start gap-2.5">
                <FileCode className="size-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Betrokken bestanden</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {aiContext.affected_files.map((f) => (
                      <code
                        key={f}
                        className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                      >
                        {f}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Steps */}
        {aiResult && (
          <div className="px-5 py-4">
            <ol className="space-y-1">
              {aiResult.steps.map((step) => (
                <li
                  key={step.step}
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    step.status === "in_progress" && "bg-blue-50/80",
                    step.status === "done" && "opacity-70",
                  )}
                >
                  <StepIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          step.status === "done" && "line-through text-muted-foreground",
                        )}
                      >
                        {step.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        ~{step.estimated_minutes}m
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Completed banner */}
        {isCompleted && aiResult.completed_at && (
          <div className="border-t border-emerald-100 bg-emerald-50/50 px-5 py-3 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Alle stappen voltooid</span>
            <span className="text-sm text-emerald-600/70">
              —{" "}
              {new Date(aiResult.completed_at).toLocaleTimeString("nl-NL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
