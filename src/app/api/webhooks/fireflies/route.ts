import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { processFirefliesWebhook } from "@/lib/services/fireflies-webhook";

function verifyFirefliesSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.FIREFLIES_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature");

  if (!verifyFirefliesSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const { meetingId, eventType } = payload;

  if (eventType !== "Transcription completed" || !meetingId) {
    return NextResponse.json({ skipped: true });
  }

  const result = await processFirefliesWebhook(meetingId);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result);
}
