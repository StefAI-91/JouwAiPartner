import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IssueDetail } from "@/components/issues/issue-detail";
import type { PortalIssue } from "@repo/database/queries/portal";

// CP-009 (DEPLOY-V1-01..02) — bewaakt de klant-facing rendering: vertaalde
// titel/beschrijving als die er zijn, source-indicator zichtbaar, en geen
// markdown-injectie via raw HTML. Een fout hier is direct zichtbaar voor de
// klant; daarom gedragstests op input → DOM, niet op interne props.

function makeIssue(overrides: Partial<PortalIssue> = {}): PortalIssue {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    issue_number: 42,
    title: "Internal title",
    description: "Internal description",
    client_title: null,
    client_description: null,
    status: "in_progress",
    type: "bug",
    priority: "high",
    source: "portal",
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-26T10:00:00Z",
    closed_at: null,
    ...overrides,
  };
}

describe("IssueDetail", () => {
  it("toont client_title als die ingevuld is", () => {
    render(
      <IssueDetail
        projectId="p1"
        issue={makeIssue({ client_title: "Klant-vertaling", title: "Tech jargon" })}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Klant-vertaling");
    expect(screen.queryByText("Tech jargon")).not.toBeInTheDocument();
  });

  it("valt terug op interne title als client_title leeg is", () => {
    render(
      <IssueDetail
        projectId="p1"
        issue={makeIssue({ client_title: null, title: "Default heading" })}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Default heading");
  });

  it("rendert client_description boven internal description (markdown)", () => {
    render(
      <IssueDetail
        projectId="p1"
        issue={makeIssue({
          client_description: "**Bold klant-tekst**",
          description: "internal raw",
        })}
      />,
    );
    const strong = screen.getByText("Bold klant-tekst");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.queryByText("internal raw")).not.toBeInTheDocument();
  });

  it("toont 'Onze melding' source-badge voor source='portal'", () => {
    render(<IssueDetail projectId="p1" issue={makeIssue({ source: "portal" })} />);
    expect(screen.getAllByLabelText("Onze melding").length).toBeGreaterThan(0);
  });

  it("toont 'JAIP-melding' source-badge voor source='manual'", () => {
    render(<IssueDetail projectId="p1" issue={makeIssue({ source: "manual" })} />);
    expect(screen.getAllByLabelText("JAIP-melding").length).toBeGreaterThan(0);
  });

  it("valt terug op JAIP voor onbekende source-waarden", () => {
    render(<IssueDetail projectId="p1" issue={makeIssue({ source: "slack" })} />);
    expect(screen.getAllByLabelText("JAIP-melding").length).toBeGreaterThan(0);
  });

  it("toont placeholder als geen body aanwezig is", () => {
    render(
      <IssueDetail
        projectId="p1"
        issue={makeIssue({ description: null, client_description: null })}
      />,
    );
    expect(screen.getByText("Geen beschrijving beschikbaar.")).toBeInTheDocument();
  });

  it("rendert geen rauwe HTML uit de description (XSS-defensie via react-markdown)", () => {
    render(
      <IssueDetail
        projectId="p1"
        issue={makeIssue({
          description: '<img src=x onerror="alert(1)">click',
          client_description: null,
        })}
      />,
    );
    // react-markdown rendert de string als tekst, geen <img> in de DOM.
    const { container } = { container: document.body };
    expect(container.querySelector("img")).toBeNull();
  });
});
