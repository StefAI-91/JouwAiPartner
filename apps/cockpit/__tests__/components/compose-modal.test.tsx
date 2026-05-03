// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

/**
 * CC-008 — UX-polish op de cockpit compose-modal.
 *
 * Asserties:
 *   - autofocus landt op de textarea (niet op project-select);
 *   - ESC-key roept onClose aan;
 *   - submit-knop toont de geselecteerde projectnaam ("Verstuur naar Acme").
 */

const composeMock = vi.hoisted(() =>
  vi.fn(async () => ({ success: true as const, messageId: "msg-1" })),
);
const routerPush = vi.hoisted(() => vi.fn());

vi.mock("@/features/inbox/actions/compose", () => ({
  composeMessageToClientAction: composeMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

import { ComposeModal } from "@/features/inbox/components/compose-modal";

const PROJECTS = [
  { id: "p-1", name: "Acme", organization_id: "o-1" },
  { id: "p-2", name: "Globex", organization_id: "o-2" },
] as never;

beforeEach(() => {
  composeMock.mockReset();
  composeMock.mockResolvedValue({ success: true, messageId: "msg-1" });
  routerPush.mockReset();
});

afterEach(() => cleanup());

describe("ComposeModal — CC-008 UX polish", () => {
  it("autofocus landt op de textarea bij open", () => {
    render(<ComposeModal projects={PROJECTS} initialProjectId="p-1" onClose={() => {}} />);
    const textarea = screen.getByPlaceholderText(/Schrijf je bericht/i);
    expect(document.activeElement).toBe(textarea);
  });

  it("ESC-key roept onClose aan", () => {
    const onClose = vi.fn();
    render(<ComposeModal projects={PROJECTS} initialProjectId="p-1" onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("submit-knop toont projectnaam in label ('Verstuur naar Acme')", () => {
    render(<ComposeModal projects={PROJECTS} initialProjectId="p-1" onClose={() => {}} />);
    expect(screen.getByRole("button", { name: /Verstuur naar Acme/i })).toBeInTheDocument();
  });

  it("project wijzigen update de submit-knop-tekst", () => {
    render(<ComposeModal projects={PROJECTS} initialProjectId="p-1" onClose={() => {}} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "p-2" } });
    expect(screen.getByRole("button", { name: /Verstuur naar Globex/i })).toBeInTheDocument();
  });
});
