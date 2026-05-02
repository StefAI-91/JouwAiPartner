import { describe, it, expect } from "vitest";
import {
  feedbackEndorsedTemplate,
  feedbackDeclinedTemplate,
  feedbackDeferredTemplate,
  feedbackConvertedTemplate,
  feedbackProgressTemplate,
  feedbackDoneTemplate,
  pickTemplateForStatus,
} from "../../src/templates";
import { newTeamReplyTemplate } from "../../src/templates/new-team-reply";
import type { IssueForTemplate } from "../../src/templates/types";

const baseIssue: IssueForTemplate = {
  id: "issue-1",
  project_id: "proj-1",
  title: "Knop werkt niet",
  client_title: null,
  status: "needs_pm_review",
  decline_reason: null,
};

const PORTAL = "https://portal.jouwai.nl";
const FEEDBACK_DEEPLINK = `${PORTAL}/projects/proj-1/feedback/issue-1`;
const INBOX_DEEPLINK = `${PORTAL}/projects/proj-1/inbox`;

describe("feedback-endorsed", () => {
  it("subject en deeplink kloppen", () => {
    const m = feedbackEndorsedTemplate({ issue: baseIssue, portalUrl: PORTAL });
    expect(m.subject).toBe("Je verzoek staat in de planning");
    expect(m.html).toContain(FEEDBACK_DEEPLINK);
    expect(m.text).toContain(FEEDBACK_DEEPLINK);
    expect(m.html).toContain("Knop werkt niet");
  });

  it("gebruikt client_title boven title als die er is", () => {
    const m = feedbackEndorsedTemplate({
      issue: { ...baseIssue, client_title: "Klant-titel" },
      portalUrl: PORTAL,
    });
    expect(m.html).toContain("Klant-titel");
    expect(m.html).not.toContain("Knop werkt niet");
  });
});

describe("feedback-declined — sober met decline_reason", () => {
  it("neemt de decline_reason letterlijk over", () => {
    const reason = "We focussen dit kwartaal op performance.\nVolgend kwartaal opnieuw bekijken.";
    const m = feedbackDeclinedTemplate({
      issue: { ...baseIssue, decline_reason: reason },
      portalUrl: PORTAL,
    });
    expect(m.subject).toBe("Update over je verzoek");
    // Multi-line reason moet leesbaar in HTML staan (escaped, met behoud van newlines via white-space:pre-wrap)
    expect(m.html).toContain("We focussen dit kwartaal op performance");
    expect(m.html).toContain("Volgend kwartaal opnieuw bekijken");
    expect(m.text).toContain(reason);
    expect(m.html).toContain(FEEDBACK_DEEPLINK);
  });

  it("rendert ook zonder reason zonder te crashen", () => {
    const m = feedbackDeclinedTemplate({ issue: baseIssue, portalUrl: PORTAL });
    expect(m.subject).toBe("Update over je verzoek");
    expect(m.html).toContain(FEEDBACK_DEEPLINK);
  });

  it("escapet HTML in decline_reason (geen XSS-doorgang)", () => {
    const m = feedbackDeclinedTemplate({
      issue: { ...baseIssue, decline_reason: "<script>alert(1)</script>" },
      portalUrl: PORTAL,
    });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

describe("feedback-deferred / progress / done / converted", () => {
  it("deferred — subject en deeplink", () => {
    const m = feedbackDeferredTemplate({ issue: baseIssue, portalUrl: PORTAL });
    expect(m.subject).toBe("We parkeren dit voor later");
    expect(m.html).toContain(FEEDBACK_DEEPLINK);
  });

  it("progress — subject en deeplink", () => {
    const m = feedbackProgressTemplate({ issue: baseIssue, portalUrl: PORTAL });
    expect(m.subject).toBe("We zijn ermee aan de slag");
    expect(m.html).toContain(FEEDBACK_DEEPLINK);
  });

  it("done — subject en deeplink", () => {
    const m = feedbackDoneTemplate({ issue: baseIssue, portalUrl: PORTAL });
    expect(m.subject).toBe("Klaar — bekijk wat we hebben opgeleverd");
    expect(m.html).toContain(FEEDBACK_DEEPLINK);
  });

  it("converted — verwijst naar inbox-deeplink, niet feedback-deeplink", () => {
    const m = feedbackConvertedTemplate({ issue: baseIssue, portalUrl: PORTAL });
    expect(m.subject).toBe("We hebben hier een vraag over");
    expect(m.html).toContain(INBOX_DEEPLINK);
    expect(m.html).not.toContain("/feedback/issue-1");
  });
});

describe("new-team-reply", () => {
  it("subject + preview + inbox-deeplink", () => {
    const m = newTeamReplyTemplate({
      question: { id: "q-1", project_id: "proj-1", body: "Wat is de planning?" },
      replyPreview: "We mikken op volgende week vrijdag.",
      portalUrl: PORTAL,
    });
    expect(m.subject).toBe("Je hebt een nieuw antwoord");
    expect(m.html).toContain("We mikken op volgende week vrijdag");
    expect(m.html).toContain(INBOX_DEEPLINK);
  });
});

describe("pickTemplateForStatus", () => {
  it("triggert mail voor de zes klant-zichtbare statussen", () => {
    expect(pickTemplateForStatus("triage")?.tag).toBe("feedback-triage");
    expect(pickTemplateForStatus("declined")?.tag).toBe("feedback-declined");
    expect(pickTemplateForStatus("deferred")?.tag).toBe("feedback-deferred");
    expect(pickTemplateForStatus("converted_to_qa")?.tag).toBe("feedback-converted_to_qa");
    expect(pickTemplateForStatus("in_progress")?.tag).toBe("feedback-in_progress");
    expect(pickTemplateForStatus("done")?.tag).toBe("feedback-done");
  });

  it("retourneert null voor statussen zonder mail-trigger", () => {
    expect(pickTemplateForStatus("needs_pm_review")).toBeNull();
    expect(pickTemplateForStatus("backlog")).toBeNull();
    expect(pickTemplateForStatus("todo")).toBeNull();
    expect(pickTemplateForStatus("cancelled")).toBeNull();
  });
});

describe("deeplink — trailing slash op portalUrl", () => {
  it("dedupeert dubbele slashes", () => {
    const m = feedbackEndorsedTemplate({
      issue: baseIssue,
      portalUrl: "https://portal.jouwai.nl/",
    });
    expect(m.html).toContain("https://portal.jouwai.nl/projects/proj-1/feedback/issue-1");
    expect(m.html).not.toContain("portal.jouwai.nl//");
  });
});
