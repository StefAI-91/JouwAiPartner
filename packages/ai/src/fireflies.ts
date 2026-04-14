const FIREFLIES_API = "https://api.fireflies.ai/graphql";

export interface FirefliesMeetingAttendee {
  displayName: string;
  email: string;
  name: string;
}

export interface FirefliesTranscript {
  id: string;
  title: string;
  date: string;
  participants: string[];
  organizer_email: string | null;
  meeting_attendees: FirefliesMeetingAttendee[];
  summary: {
    overview: string;
    notes: string;
    action_items: string;
    shorthand_bullet: string;
    keywords: string[];
    topics_discussed: string[];
  };
  sentences: {
    index: number;
    text: string;
    speaker_name: string;
    start_time: number;
    end_time: number;
  }[];
  audio_url: string | null;
}

const LIST_TRANSCRIPTS_QUERY = `
  query RecentTranscripts($limit: Int) {
    transcripts(limit: $limit) {
      id
      title
      date
      participants
      organizer_email
    }
  }
`;

const TRANSCRIPT_QUERY = `
  query Transcript($id: String!) {
    transcript(id: $id) {
      id
      title
      date
      participants
      organizer_email
      meeting_attendees {
        displayName
        email
        name
      }
      audio_url
      summary {
        overview
        notes
        action_items
        shorthand_bullet
        keywords
        topics_discussed
      }
      sentences {
        index
        text
        speaker_name
        start_time
        end_time
      }
    }
  }
`;

export async function fetchFirefliesTranscript(
  meetingId: string,
): Promise<FirefliesTranscript | null> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) throw new Error("FIREFLIES_API_KEY is not set");

  const response = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: TRANSCRIPT_QUERY,
      variables: { id: meetingId },
    }),
  });

  if (!response.ok) return null;

  const result = (await response.json()) as {
    errors?: { message: string }[];
    data?: { transcript: FirefliesTranscript | null };
  };
  if (result.errors?.length) {
    console.error("Fireflies API error:", result.errors[0].message);
    return null;
  }
  return result.data?.transcript ?? null;
}

export interface FirefliesListItem {
  id: string;
  title: string;
  date: string;
  participants: string[];
  organizer_email: string | null;
}

export async function listFirefliesTranscripts(limit: number = 30): Promise<FirefliesListItem[]> {
  const apiKey = process.env.FIREFLIES_API_KEY;
  if (!apiKey) throw new Error("FIREFLIES_API_KEY is not set");

  const response = await fetch(FIREFLIES_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: LIST_TRANSCRIPTS_QUERY,
      variables: { limit },
    }),
  });

  if (!response.ok) return [];

  const result = (await response.json()) as {
    errors?: { message: string }[];
    data?: { transcripts: FirefliesListItem[] };
  };
  if (result.errors?.length) {
    console.error("Fireflies API error:", result.errors[0].message);
    return [];
  }
  return result.data?.transcripts ?? [];
}
