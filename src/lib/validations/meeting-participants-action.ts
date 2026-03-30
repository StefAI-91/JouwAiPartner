import { z } from "zod";

export const linkMeetingParticipantsSchema = z.object({
  meetingId: z.string().uuid(),
  personIds: z.array(z.string().uuid()),
});
