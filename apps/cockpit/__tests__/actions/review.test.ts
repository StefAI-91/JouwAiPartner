import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mockAuthenticated,
  mockUnauthenticated,
  createIntegrationServerMock,
} from "../helpers/mock-auth";
import { createNextCacheMock, resetNextMocks } from "../helpers/mock-next";
import {
  seedOrganization,
  seedMeeting,
  seedExtraction,
  TEST_IDS,
} from "../../../../packages/database/__tests__/helpers/seed";
import { cleanupTestData } from "../../../../packages/database/__tests__/helpers/cleanup";
import { getTestClient } from "../../../../packages/database/__tests__/helpers/test-client";

vi.mock("next/cache", () => createNextCacheMock());
vi.mock("@repo/database/supabase/server", () => createIntegrationServerMock());

import { describeWithDb } from "../helpers/describe-with-db";

describeWithDb("Review Server Actions (integration)")("Review Server Actions (integration)", () => {
  beforeEach(async () => {
    mockAuthenticated(TEST_IDS.userId);
    resetNextMocks();
    await seedOrganization();
    await seedMeeting({
      organization_id: TEST_IDS.organization,
      verification_status: "draft",
    });
    await seedExtraction({ verification_status: "draft" });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("approveMeetingAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/review");
      return mod.approveMeetingAction;
    }

    it("sets verification_status to verified", async () => {
      const approveMeetingAction = await getAction();
      const result = await approveMeetingAction({
        meetingId: TEST_IDS.meeting,
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("meetings")
        .select("verification_status")
        .eq("id", TEST_IDS.meeting)
        .single();
      expect(data?.verification_status).toBe("verified");
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const approveMeetingAction = await getAction();
      const result = await approveMeetingAction({
        meetingId: TEST_IDS.meeting,
      });
      expect(result).toEqual({ error: "Unauthorized" });
    });
  });

  describe("rejectMeetingAction", () => {
    async function getAction() {
      const mod = await import("../../src/actions/review");
      return mod.rejectMeetingAction;
    }

    it("rejects meeting with reason", async () => {
      const rejectMeetingAction = await getAction();
      const result = await rejectMeetingAction({
        meetingId: TEST_IDS.meeting,
        reason: "Low quality transcript",
      });

      expect(result).toEqual({ success: true });

      const db = getTestClient();
      const { data } = await db
        .from("meetings")
        .select("verification_status")
        .eq("id", TEST_IDS.meeting)
        .single();
      expect(data?.verification_status).toBe("rejected");
    });

    it("returns error when not logged in", async () => {
      mockUnauthenticated();
      const rejectMeetingAction = await getAction();
      const result = await rejectMeetingAction({
        meetingId: TEST_IDS.meeting,
        reason: "Bad quality",
      });
      expect(result).toEqual({ error: "Unauthorized" });
    });

    it("rejects empty reason", async () => {
      const rejectMeetingAction = await getAction();
      const result = await rejectMeetingAction({
        meetingId: TEST_IDS.meeting,
        reason: "",
      });
      expect(result).toHaveProperty("error");
    });
  });
});
