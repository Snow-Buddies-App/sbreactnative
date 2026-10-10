import { describe, expect, it, jest } from '@jest/globals';
import { relationshipWith } from '../api';
import { parseAuthLink } from '../authLinks';
import type { BuddyRequest } from '../database.types';
import { formatTripDate, fromIsoDate, toIsoDate, upcomingDays } from '../dates';
import { initials, meetsSkill } from '../labels';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('relationshipWith', () => {
  const request = (overrides: Partial<BuddyRequest>): BuddyRequest => ({
    id: 1,
    requester_id: 'me',
    addressee_id: 'them',
    status: 'pending',
    created_at: '',
    responded_at: null,
    ...overrides,
  });

  it('classifies requests from my point of view', () => {
    expect(relationshipWith('me', 'them', []).kind).toBe('none');
    expect(relationshipWith('me', 'them', [request({})]).kind).toBe('outgoing');
    expect(relationshipWith('me', 'them', [request({ requester_id: 'them', addressee_id: 'me' })]).kind).toBe('incoming');
    expect(relationshipWith('me', 'them', [request({ status: 'accepted' })]).kind).toBe('buddies');
    expect(relationshipWith('me', 'other', [request({})]).kind).toBe('none');
  });
});

describe('parseAuthLink', () => {
  it('reads PKCE codes and implicit tokens', () => {
    expect(parseAuthLink('sb://login?code=abc&type=recovery')).toMatchObject({ code: 'abc', type: 'recovery' });
    expect(parseAuthLink('sb://login#access_token=a&refresh_token=r&type=signup')).toMatchObject({
      accessToken: 'a',
      refreshToken: 'r',
      type: 'signup',
    });
    expect(parseAuthLink('sb://trip/5')).toBeNull();
  });
});

describe('dates', () => {
  it('round-trips local ISO dates', () => {
    const date = new Date(2026, 0, 5);
    expect(toIsoDate(date)).toBe('2026-01-05');
    expect(fromIsoDate('2026-01-05').getDate()).toBe(5);
  });

  it('labels today and tomorrow', () => {
    const today = new Date(2026, 11, 31);
    expect(formatTripDate('2026-12-31', today)).toBe('Today');
    expect(formatTripDate('2027-01-01', today)).toBe('Tomorrow');
  });

  it('lists consecutive upcoming days across month ends', () => {
    expect(upcomingDays(3, new Date(2026, 0, 31)).map(toIsoDate)).toEqual([
      '2026-01-31',
      '2026-02-01',
      '2026-02-02',
    ]);
  });
});

describe('labels', () => {
  it('compares skill levels', () => {
    expect(meetsSkill('advanced', 'intermediate')).toBe(true);
    expect(meetsSkill('beginner', 'advanced')).toBe(false);
    expect(meetsSkill(null, null)).toBe(true);
    expect(meetsSkill(null, 'beginner')).toBe(false);
  });

  it('builds initials', () => {
    expect(initials('Ava Lopez')).toBe('AL');
    expect(initials('ben')).toBe('BE');
    expect(initials('  ')).toBe('?');
  });
});
