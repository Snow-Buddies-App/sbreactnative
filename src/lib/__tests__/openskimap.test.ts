import { describe, expect, it } from '@jest/globals';
import { bboxAround, distanceKm, featureLines, parseSkiMapFeatures, runColor } from '../openskimap';

describe('bboxAround', () => {
  it('produces minLon,minLat,maxLon,maxLat within the API area limit', () => {
    const [minLon, minLat, maxLon, maxLat] = bboxAround({ latitude: 39.64, longitude: -106.37 }, 50)
      .split(',')
      .map(Number);
    expect(minLon).toBeLessThan(maxLon);
    expect(minLat).toBeLessThan(maxLat);
    const widthKm = distanceKm({ latitude: 39.64, longitude: minLon }, { latitude: 39.64, longitude: maxLon });
    const heightKm = distanceKm({ latitude: minLat, longitude: -106.37 }, { latitude: maxLat, longitude: -106.37 });
    expect(widthKm * heightKm).toBeLessThanOrEqual(1000);
  });
});

describe('featureLines', () => {
  it('converts GeoJSON [lon, lat] to map coordinates', () => {
    expect(featureLines({ type: 'LineString', coordinates: [[-106, 39, 3000], [-106.1, 39.1]] })).toEqual([
      [
        { latitude: 39, longitude: -106 },
        { latitude: 39.1, longitude: -106.1 },
      ],
    ]);
    expect(featureLines({ type: 'Point', coordinates: [1, 2] })).toEqual([]);
    expect(featureLines(null)).toEqual([]);
  });
});

describe('parseSkiMapFeatures', () => {
  const line = { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] as [number, number][] };

  it('splits runs and lifts and skips non-downhill runs', () => {
    const data = parseSkiMapFeatures([
      { type: 'Feature', geometry: line, properties: { type: 'run', id: 'r1', name: 'Riva', difficulty: 'advanced', uses: ['downhill'] } },
      { type: 'Feature', geometry: line, properties: { type: 'run', id: 'r2', uses: ['nordic'] } },
      { type: 'Feature', geometry: line, properties: { type: 'lift', id: 'l1', name: 'Chair 4', liftType: 'chair_lift' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { type: 'lift', id: 'l2' } },
    ]);
    expect(data.runs.map((r) => r.id)).toEqual(['r1']);
    expect(data.runs[0].difficulty).toBe('advanced');
    expect(data.lifts.map((l) => l.id)).toEqual(['l1']);
  });
});

describe('runColor', () => {
  it('uses trail-sign colours', () => {
    expect(runColor('easy')).toBe('#2E9E4F');
    expect(runColor('intermediate')).toBe('#1E62D0');
    expect(runColor(null)).toBe('#7A8794');
  });
});
