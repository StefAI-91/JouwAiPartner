export function isValidDuration(sentences: { start_time: number; end_time: number }[]): {
  valid: boolean;
  duration: number;
} {
  if (sentences.length === 0) return { valid: true, duration: 0 };
  const firstStart = sentences[0].start_time;
  const lastEnd = sentences[sentences.length - 1].end_time;
  const durationMinutes = (lastEnd - firstStart) / 60;
  return { valid: durationMinutes >= 2, duration: durationMinutes };
}

export function hasParticipants(participants: string[] | undefined): boolean {
  return !!participants && participants.length >= 2;
}
