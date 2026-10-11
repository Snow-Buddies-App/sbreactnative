import { describe, expect, it, jest } from '@jest/globals';

import { directionsUrl, pinExpiry } from '../pins';
import { formatDuration, recordingExtension } from '../voice';

jest.mock('../supabase', () => ({ supabase: {} }));

describe('pinExpiry', () => {
  const now = new Date('2026-01-10T10:00:00Z');

  it('keeps meetups until 2 hours after the meeting time', () => {
    const meetAt = new Date('2026-01-10T13:30:00Z');
    expect(pinExpiry({ kind: 'meetup', meetAt, expiresInHours: 24 }, now).toISOString()).toBe(
      '2026-01-10T15:30:00.000Z',
    );
  });

  it('uses the chosen lifetime for plain pins', () => {
    expect(pinExpiry({ kind: 'pin', meetAt: null, expiresInHours: 3 }, now).toISOString()).toBe(
      '2026-01-10T13:00:00.000Z',
    );
  });
});

describe('directionsUrl', () => {
  it('builds a walking directions link', () => {
    expect(directionsUrl({ latitude: 39.6, longitude: -106.3 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=39.6,-106.3&travelmode=walking',
    );
  });
});

describe('voice helpers', () => {
  it('detects recording file types', () => {
    expect(recordingExtension('file:///tmp/recording-123.m4a', 'ios')).toBe('m4a');
    expect(recordingExtension('blob:http://localhost/abc', 'web')).toBe('webm');
    expect(recordingExtension('file:///tmp/unknown.xyz', 'android')).toBe('m4a');
  });

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(4_200)).toBe('0:04');
    expect(formatDuration(125_000)).toBe('2:05');
  });
});
