import { describe, it, expect } from "vitest";
import { buildMeetingTitle } from "../../src/pipeline/lib/title-builder";

describe("buildMeetingTitle", () => {
  it("internal board → (Management): subject", () => {
    expect(
      buildMeetingTitle("prioriteiten Q3", {
        meetingType: "board",
        partyType: "internal",
        organizationName: null,
        projectName: null,
      }),
    ).toBe("(Management): prioriteiten Q3");
  });

  it("internal team_sync → (Team): subject", () => {
    expect(
      buildMeetingTitle("sprint review", {
        meetingType: "team_sync",
        partyType: "internal",
        organizationName: null,
        projectName: null,
      }),
    ).toBe("(Team): sprint review");
  });

  it("internal one_on_one → (Één-op-één): subject", () => {
    expect(
      buildMeetingTitle("code review proces", {
        meetingType: "one_on_one",
        partyType: "internal",
        organizationName: null,
        projectName: null,
      }),
    ).toBe("(Één-op-één): code review proces");
  });

  it("internal meeting ignores org/project even if provided", () => {
    expect(
      buildMeetingTitle("onderwerp", {
        meetingType: "team_sync",
        partyType: "internal",
        organizationName: "Acme BV",
        projectName: "Webshop",
      }),
    ).toBe("(Team): onderwerp");
  });

  it("external sales + org → (Sales): Org → subject", () => {
    expect(
      buildMeetingTitle("offerte website", {
        meetingType: "sales",
        partyType: "client",
        organizationName: "Bakkerij de Groot",
        projectName: null,
      }),
    ).toBe("(Sales): Bakkerij de Groot → offerte website");
  });

  it("external status_update + org + project → (Status): Org / Project → subject", () => {
    expect(
      buildMeetingTitle("voortgang sprint 4", {
        meetingType: "status_update",
        partyType: "client",
        organizationName: "Acme BV",
        projectName: "Webshop",
      }),
    ).toBe("(Status): Acme BV / Webshop → voortgang sprint 4");
  });

  it("external kickoff + project only → (Kickoff): Project → subject", () => {
    expect(
      buildMeetingTitle("rolverdeling en planning", {
        meetingType: "project_kickoff",
        partyType: "client",
        organizationName: null,
        projectName: "Dashboard",
      }),
    ).toBe("(Kickoff): Dashboard → rolverdeling en planning");
  });

  it("external discovery no context → (Kennismaking): subject", () => {
    expect(
      buildMeetingTitle("verkenning automatisering", {
        meetingType: "discovery",
        partyType: "client",
        organizationName: null,
        projectName: null,
      }),
    ).toBe("(Kennismaking): verkenning automatisering");
  });

  it("collaboration → (Samenwerking): subject", () => {
    expect(
      buildMeetingTitle("API integratie", {
        meetingType: "collaboration",
        partyType: "partner",
        organizationName: "TechPartner",
        projectName: null,
      }),
    ).toBe("(Samenwerking): TechPartner → API integratie");
  });

  it("unknown meeting type → (Overig): subject", () => {
    expect(
      buildMeetingTitle("onbekend onderwerp", {
        meetingType: "unknown_type",
        partyType: "other",
        organizationName: null,
        projectName: null,
      }),
    ).toBe("(Overig): onbekend onderwerp");
  });
});
