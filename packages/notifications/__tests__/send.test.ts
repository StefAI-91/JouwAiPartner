import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * CC-002 — sendMail boundary-mock test.
 *
 * Mock-grens: alleen `resend` (externe netwerk). Eigen `client.ts` /
 * `send.ts` testen we direct.
 */

const sendSpy = vi.fn();

vi.mock("resend", () => {
  class Resend {
    emails = { send: sendSpy };
  }
  return { Resend };
});

import { sendMail } from "../src/send";
import { __resetResendClientForTests } from "../src/client";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  __resetResendClientForTests();
  process.env = { ...ORIGINAL_ENV };
  // Default: test-environment, no force
  process.env.NODE_ENV = "test";
  delete process.env.RESEND_FORCE_SEND;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("sendMail — dev-mode skip", () => {
  it("skipt Resend-API-call buiten productie zonder force", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendMail({
      to: "klant@example.com",
      subject: "Hoi",
      html: "<p>Hoi</p>",
      text: "Hoi",
      tag: "feedback-triage",
    });

    expect(result).toEqual({ ok: true });
    expect(sendSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      "[notifications] dev-mode skip",
      expect.objectContaining({ to: "klant@example.com", tag: "feedback-triage" }),
    );
  });
});

describe("sendMail — productie / force-send", () => {
  it("stuurt mail met correcte payload + tag wanneer RESEND_FORCE_SEND=1", async () => {
    process.env.RESEND_FORCE_SEND = "1";
    process.env.RESEND_API_KEY = "key_abc";
    process.env.RESEND_FROM_EMAIL = "notifications@jouwaipartner.nl";
    sendSpy.mockResolvedValueOnce({ data: { id: "mail_1" }, error: null });

    const result = await sendMail({
      to: "klant@example.com",
      subject: "Update",
      html: "<p>x</p>",
      text: "x",
      tag: "feedback-declined",
    });

    expect(result).toEqual({ ok: true });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith({
      from: "notifications@jouwaipartner.nl",
      to: "klant@example.com",
      subject: "Update",
      html: "<p>x</p>",
      text: "x",
      tags: [{ name: "category", value: "feedback-declined" }],
    });
  });

  it("retourneert {ok:false, no_api_key} als API-key ontbreekt in productie", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.RESEND_API_KEY;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendMail({
      to: "x@y.nl",
      subject: "s",
      html: "h",
      text: "t",
      tag: "feedback-done",
    });

    expect(result).toEqual({ ok: false, reason: "no_api_key" });
    expect(sendSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("retourneert {ok:false, no_from_email} als FROM ontbreekt", async () => {
    process.env.NODE_ENV = "production";
    process.env.RESEND_API_KEY = "k";
    delete process.env.RESEND_FROM_EMAIL;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendMail({
      to: "x@y.nl",
      subject: "s",
      html: "h",
      text: "t",
      tag: "feedback-done",
    });

    expect(result).toEqual({ ok: false, reason: "no_from_email" });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("retourneert {ok:false, <reden>} bij Resend-error — geen throw", async () => {
    process.env.RESEND_FORCE_SEND = "1";
    process.env.RESEND_API_KEY = "k";
    process.env.RESEND_FROM_EMAIL = "from@x.nl";
    sendSpy.mockResolvedValueOnce({ data: null, error: { message: "rate_limited" } });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendMail({
      to: "x@y.nl",
      subject: "s",
      html: "h",
      text: "t",
      tag: "new-team-reply",
    });

    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });
});
