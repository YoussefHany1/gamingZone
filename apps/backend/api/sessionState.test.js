import { describe, expect, it } from 'vitest';
import { activeProposals, allParticipantsAccepted, dueReminders, validateStartsAt } from './sessionState.js';

describe('session state helpers', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');
  it('validates the 60-day future window', () => {
    expect(validateStartsAt(now + 60 * 86400000, now)).toBeNull();
    expect(validateStartsAt(now, now)).toBe('starts_in_past');
    expect(validateStartsAt(now + 61 * 86400000, now)).toBe('starts_too_far');
  });
  it('ignores expired proposals', () => {
    expect(activeProposals([{ startsAt: now - 1 }, { startsAt: now + 1 }], now)).toHaveLength(1);
  });
  it('requires every participant to accept', () => {
    expect(allParticipantsAccepted(['a', 'b'], { a: 'accepted', b: 'pending' })).toBe(false);
    expect(allParticipantsAccepted(['a', 'b'], { a: 'accepted', b: 'accepted' })).toBe(true);
  });
  it('returns catch-up reminders', () => {
    expect(dueReminders(now + 10 * 60000, now, {})).toEqual(['60', '15']);
    expect(dueReminders(now - 1, now, {})).toEqual(['60', '15', 'starting']);
  });
  it('does not repeat reminders already claimed by the sweep', () => {
    expect(dueReminders(now + 10 * 60000, now, { '60': true })).toEqual(['15']);
    expect(dueReminders(now - 1, now, { '60': true, '15': true })).toEqual(['starting']);
    expect(dueReminders(now - 1, now, { '60': true, '15': true, starting: true })).toEqual([]);
  });
  it('uses the starting threshold inclusively', () => {
    expect(dueReminders(now, now, {})).toEqual(['60', '15', 'starting']);
  });
});
