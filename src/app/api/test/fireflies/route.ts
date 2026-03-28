import { NextResponse } from "next/server";

const FIREFLIES_API = "https://api.fireflies.ai/graphql";

export async function GET() {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "FIREFLIES_API_KEY not set" });
  }

  const response = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: `query { transcripts(limit: 3) { id title date participants } }`,
    }),
  });

  const raw = await response.json();
  return NextResponse.json({
    status: response.status,
    body: raw,
  });
}
