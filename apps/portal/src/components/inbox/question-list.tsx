import { MessageCircle } from "lucide-react";
import type { ClientQuestionListRow } from "@repo/database/queries/client-questions";
import { QuestionCard } from "./question-card";

/**
 * PR-023 — lijst van open klantvragen in de portal.
 *
 * `listOpenQuestionsForProject` (PR-022) filtert al op `status='open'`, dus
 * alle items in `questions` zijn open. We tonen de empty-state als de lijst
 * leeg is. Een afzonderlijke "afgehandelde (X)" sectie staat in de spec
 * (PR-REQ-284) maar zou een tweede query vragen — voor v1 zonder
 * volume-druk YAGNI.
 */
export interface QuestionListProps {
  projectId: string;
  questions: ClientQuestionListRow[];
}

export function QuestionList({ projectId, questions }: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <div className="mx-auto mb-4 grid size-10 place-items-center rounded-full bg-muted">
          <MessageCircle className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-foreground">Geen openstaande berichten</p>
        <p className="mx-auto mt-1 max-w-[36ch] text-xs text-muted-foreground">
          Zodra er een bericht is verschijnt het hier. Je kunt zelf ook altijd een nieuw gesprek
          starten.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {questions.map((q) => (
        <QuestionCard key={q.id} projectId={projectId} question={q} />
      ))}
    </ul>
  );
}
