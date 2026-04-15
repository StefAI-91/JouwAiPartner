"use client";

import { useState } from "react";
import { MOCK_THINK_MS, pickMockProposal, type MockProposal } from "../mock-responses";

/**
 * Message in the mock chat.
 * user = what the person typed
 * assistant = AI response (may contain a proposal with diffs)
 * system = status update ("✓ Toegepast", "✗ Verworpen", etc.)
 */
export type ChatMessage =
  | { role: "user"; content: string; ts: string }
  | { role: "assistant"; content: string; proposal?: MockProposal; ts: string }
  | { role: "system"; content: string; ts: string };

const INITIAL_INTRO: ChatMessage = {
  role: "system",
  content:
    'Zeg wat er moet veranderen. Probeer: "Bas is Bas Spenkelink" of "voeg toe dat Wouter aansluit in sprint 3".',
  ts: nowLabel(),
};

/**
 * Shared mock chat state used by all variant components on the playground
 * page. Each variant renders the same messages differently so we can compare
 * UX approaches side-by-side.
 */
export function useMockChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_INTRO]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;

    setMessages((m) => [...m, { role: "user", content: text, ts: nowLabel() }]);
    setInput("");
    setThinking(true);

    await new Promise((r) => setTimeout(r, MOCK_THINK_MS));

    const proposal = pickMockProposal(text);
    setMessages((m) => [
      ...m,
      { role: "assistant", content: proposal.intro, proposal, ts: nowLabel() },
    ]);
    setThinking(false);
  }

  function apply(messageIndex: number) {
    setMessages((m) => {
      const next = [...m];
      const msg = next[messageIndex];
      if (msg.role === "assistant" && msg.proposal) {
        next[messageIndex] = {
          role: "assistant",
          content: msg.content,
          ts: msg.ts,
        };
      }
      next.push({
        role: "system",
        content: "✓ Toegepast. Summary en briefing zijn opgeslagen.",
        ts: nowLabel(),
      });
      return next;
    });
    setAppliedCount((n) => n + 1);
  }

  function reject(messageIndex: number) {
    setMessages((m) => {
      const next = [...m];
      const msg = next[messageIndex];
      if (msg.role === "assistant" && msg.proposal) {
        next[messageIndex] = {
          role: "assistant",
          content: msg.content,
          ts: msg.ts,
        };
      }
      next.push({
        role: "system",
        content: "✗ Verworpen. Zeg wat er anders moet.",
        ts: nowLabel(),
      });
      return next;
    });
  }

  function reset() {
    setMessages([{ ...INITIAL_INTRO, ts: nowLabel() }]);
    setInput("");
    setAppliedCount(0);
  }

  return {
    messages,
    input,
    setInput,
    thinking,
    appliedCount,
    send,
    apply,
    reject,
    reset,
  };
}

function nowLabel(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Sample markdown summary shown in the split-editor variant. */
export const MOCK_SUMMARY_MD = `## Briefing

Bas stelde voor om de scope van fase 1 te beperken tot de kernmodule. Stef en het team gingen akkoord met deze aanpak. Er zijn concrete afspraken gemaakt over het datamodel en de planning.

## Kernpunten

### Scope fase 1
- **Besluit:** Stef en Bas gaan akkoord met fase 1 (kernmodule only).
- **Afspraak:** Datamodel wordt als eerste opgeleverd.

### Planning
- **Afspraak:** Kickoff sprint 1 volgt in week 17.

## Deelnemers
- **Bas** — Niet bekend
- **Stef Duijvestijn** — Oprichter — Jouw AI Partner

## Vervolgstappen
- [ ] Datamodel opleveren voor kickoff`;
