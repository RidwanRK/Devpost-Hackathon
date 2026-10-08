// The rules for recording what happened in a session. Pure: no database.
//   completed: actual time optional (credits planned time if left out), 0 to planned.
//   partial:   actual time required, 0 to planned; credits exactly that much.
//   skipped / planned: no actual time, no confidence update.
import { z } from 'zod';

export const SessionUpdateSchema = z.object({
  status: z.enum(['planned', 'completed', 'skipped', 'partial']),
  actualMinutes: z.number().int().nullish(),
  confidenceAfter: z.number().int().min(1).max(5).nullish(),
});

// Returns { session } with the update applied, or { error } with a message for the student.
export function applySessionUpdate(session, update) {
  const { status } = update;
  const actual = update.actualMinutes ?? null;

  if (status === 'completed' || status === 'partial') {
    if (status === 'partial' && actual === null) {
      return { error: 'Tell us how many minutes you actually studied for a partially completed session.' };
    }
    if (actual !== null && (actual < 0 || actual > session.plannedMinutes)) {
      return { error: `Actual time must be between 0 and ${session.plannedMinutes} minutes (the planned time).` };
    }
    return {
      session: { ...session, status, actualMinutes: actual, confidenceAfter: update.confidenceAfter ?? null },
    };
  }
  return { session: { ...session, status, actualMinutes: null, confidenceAfter: null } };
}
