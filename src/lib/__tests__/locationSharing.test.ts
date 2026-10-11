import { describe, expect, it, jest } from '@jest/globals';

import { formatLastSeen, isFresh, STALE_AFTER_MS } from '../locationSharing';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('isFresh', () => {
  const now = Date.parse('2026-01-10T10:00:00Z');

  it('hides positions older than the stale window', () => {
    expect(isFresh(new Date(now - 60_000).toISOString(), now)).toBe(true);
    expect(isFresh(new Date(now - STALE_AFTER_MS - 1).toISOString(), now)).toBe(false);
  });
});

describe('formatLastSeen', () => {
  const now = Date.parse('2026-01-10T10:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('formats recent updates', () => {
    expect(formatLastSeen(ago(10_000), now)).toBe('just now');
    expect(formatLastSeen(ago(60_000), now)).toBe('1 min ago');
    expect(formatLastSeen(ago(25 * 60_000), now)).toBe('25 min ago');
    expect(formatLastSeen(ago(2 * 3_600_000), now)).toBe('2 h ago');
  });
});
