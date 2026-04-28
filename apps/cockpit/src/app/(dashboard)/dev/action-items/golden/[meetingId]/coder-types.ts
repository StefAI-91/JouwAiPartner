export type Lane = "A" | "B" | "none";
export type TypeWerk = "A" | "B" | "C" | "D";
export type Category = "wachten_op_extern" | "wachten_op_beslissing" | null;

export interface FormDraft {
  content: string;
  follow_up_contact: string;
  assignee: string;
  source_quote: string;
  category: Category;
  deadline: string;
  lane: Lane;
  type_werk: TypeWerk;
  project_context: string;
  coder_notes: string;
}

export const EMPTY_DRAFT: FormDraft = {
  content: "",
  follow_up_contact: "",
  assignee: "",
  source_quote: "",
  category: null,
  deadline: "",
  lane: "A",
  type_werk: "C",
  project_context: "",
  coder_notes: "",
};

export const TYPE_WERK_LABELS: Record<TypeWerk, string> = {
  A: "A · Intern JAIP-werk",
  B: "B · JAIP levert aan externe",
  C: "C · Externe levert aan JAIP",
  D: "D · Beslissing afwachten",
};

export const LANE_LABELS: Record<Lane, string> = {
  A: "Lane A · mens beslist",
  B: "Lane B · AI mag pingen",
  none: "Lane none · niet opvolgen",
};

export interface Participant {
  id: string | null;
  name: string;
}
