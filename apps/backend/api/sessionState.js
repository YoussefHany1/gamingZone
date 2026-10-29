/** Pure play-session agreement helpers shared by routes and tests. */

export const MAX_PROPOSALS = 10;
export const MAX_SESSION_DAYS = 60;

export function normalizeStartsAt(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function validateStartsAt(startsAt, now = Date.now()) {
  if (!Number.isFinite(startsAt)) return 'invalid_starts_at';
  if (startsAt <= now) return 'starts_in_past';
  if (startsAt > now + MAX_SESSION_DAYS * 86400000) return 'starts_too_far';
  return null;
}

export function activeProposals(proposals, now = Date.now()) {
  return (Array.isArray(proposals) ? proposals : []).filter((proposal) =>
    Number.isFinite(proposal?.startsAt) && proposal.startsAt > now && proposal.status !== 'withdrawn',
  );
}

export function allParticipantsAccepted(participantUids, responses) {
  return participantUids.length > 0 && participantUids.every((uid) => responses?.[uid] === 'accepted');
}

export function dueReminders(startsAt, now, remindersSent = {}) {
  const minutes = (startsAt - now) / 60000;
  const due = [];
  if (minutes <= 60 && !remindersSent['60']) due.push('60');
  if (minutes <= 15 && !remindersSent['15']) due.push('15');
  if (minutes <= 0 && !remindersSent.starting) due.push('starting');
  return due;
}
