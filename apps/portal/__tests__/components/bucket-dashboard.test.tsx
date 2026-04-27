import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { BucketDashboard } from "@/components/issues/bucket-dashboard";
import type { PortalIssue } from "@repo/database/queries/portal";

// CP-008 — BucketDashboard groepeert issues op portal-statusgroep en toont
// per bucket de tellingen uit `getProjectIssueCounts`. Deze test bewaakt dat
// de status→bucket mapping niet stilletjes drift; een fout hier zou betekenen
// dat een klant zijn open bug onder "Afgerond" zou zien.

function makeIssue(overrides: Partial<PortalIssue> = {}): PortalIssue {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    issue_number: overrides.issue_number ?? 1,
    title: "Internal title",
    description: null,
    client_title: null,
    client_description: null,
    status: "triage",
    type: "bug",
    priority: "medium",
    source: "portal",
    created_at: "2026-04-01T10:00:00Z",
    updated_at: "2026-04-26T10:00:00Z",
    closed_at: null,
    ...overrides,
  };
}

describe("BucketDashboard", () => {
  it("rendert vier buckets met de portal-labels", () => {
    render(
      <BucketDashboard
        projectId="p1"
        issues={[]}
        counts={{ ontvangen: 0, ingepland: 0, in_behandeling: 0, afgerond: 0 }}
      />,
    );

    for (const label of ["Ontvangen", "Ingepland", "In behandeling", "Afgerond"]) {
      expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
    }
  });

  it("groepeert een 'in_progress' issue onder 'In behandeling'", () => {
    render(
      <BucketDashboard
        projectId="p1"
        issues={[makeIssue({ id: "i1", status: "in_progress", title: "Login defect" })]}
        counts={{ ontvangen: 0, ingepland: 0, in_behandeling: 1, afgerond: 0 }}
      />,
    );

    const bucket = screen.getByRole("heading", { name: "In behandeling" }).closest("section")!;
    expect(within(bucket).getByText("Login defect")).toBeInTheDocument();
  });

  it("toont 'Geen items' in lege buckets", () => {
    render(
      <BucketDashboard
        projectId="p1"
        issues={[makeIssue({ status: "done" })]}
        counts={{ ontvangen: 0, ingepland: 0, in_behandeling: 0, afgerond: 1 }}
      />,
    );

    const ontvangen = screen.getByRole("heading", { name: "Ontvangen" }).closest("section")!;
    expect(within(ontvangen).getByText("Geen items")).toBeInTheDocument();
  });

  it("toont de count uit props, niet uit de geleverde issues (paginering-onafhankelijk)", () => {
    // Slechts 1 issue in de page-load, maar de echte teller is 12 (volgende
    // pagina komt nog). De header moet 12 tonen, niet 1.
    render(
      <BucketDashboard
        projectId="p1"
        issues={[makeIssue({ status: "triage" })]}
        counts={{ ontvangen: 12, ingepland: 0, in_behandeling: 0, afgerond: 0 }}
      />,
    );

    const ontvangen = screen.getByRole("heading", { name: "Ontvangen" }).closest("section")!;
    expect(within(ontvangen).getByText("12")).toBeInTheDocument();
  });

  it("toont client_title als die ingevuld is, anders interne title", () => {
    render(
      <BucketDashboard
        projectId="p1"
        issues={[
          makeIssue({ id: "a", title: "Tech jargon", client_title: "Klant-vertaling" }),
          makeIssue({ id: "b", title: "Geen vertaling", client_title: null }),
        ]}
        counts={{ ontvangen: 2, ingepland: 0, in_behandeling: 0, afgerond: 0 }}
      />,
    );

    expect(screen.getByText("Klant-vertaling")).toBeInTheDocument();
    expect(screen.getByText("Geen vertaling")).toBeInTheDocument();
    expect(screen.queryByText("Tech jargon")).not.toBeInTheDocument();
  });
});
