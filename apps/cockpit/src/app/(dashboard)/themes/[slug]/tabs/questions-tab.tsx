/**
 * UI-274: Open vragen-tab. V1 is deze tab een placeholder — het PRD
 * noemt `type='need'` status-tracking (open/resolved) pas in v2.
 */
export function QuestionsTab() {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6">
      <h3 className="text-[14px] font-semibold text-foreground">Komt in v2</h3>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Open vragen worden gevoed uit extractions met <code className="font-mono">type=need</code>{" "}
        en een status-veld (open/resolved). Dat status-veld staat gepland voor v2 zodat deze tab
        vraagt die nog niet beantwoord zijn automatisch kan tonen.
      </p>
    </div>
  );
}
