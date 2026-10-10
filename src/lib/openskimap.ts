// Client for the OpenSkiMap API (https://openskimap.org), which serves ski
// areas, runs and lifts derived from OpenStreetMap and Skimap.org.
// Data © OpenStreetMap contributors (ODbL) — attribution is shown on the map.

const API_URL = process.env.EXPO_PUBLIC_OPENSKIMAP_API_URL ?? 'https://api.openskimap.org';

export type LatLng = { latitude: number; longitude: number };
type Position = [number, number] | [number, number, number];

export type RunDifficulty =
  | 'novice'
  | 'easy'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'freeride'
  | 'extreme';

export type SkiMapRun = {
  id: string;
  name: string | null;
  difficulty: RunDifficulty | null;
  lines: LatLng[][];
};

export type SkiMapLift = {
  id: string;
  name: string | null;
  liftType: string | null;
  lines: LatLng[][];
};

export type SkiMapData = { runs: SkiMapRun[]; lifts: SkiMapLift[] };

export type SkiAreaSearchResult = {
  id: string;
  name: string;
  location: string | null;
  center: LatLng;
};

type Geometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'LineString'; coordinates: Position[] }
  | { type: 'MultiLineString'; coordinates: Position[][] }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

type Feature = {
  type: 'Feature';
  geometry: Geometry | null;
  properties: Record<string, unknown> & { type?: string; id?: string; name?: string | null };
};

const toLatLng = ([longitude, latitude]: Position): LatLng => ({ latitude, longitude });

/** Lines to draw for a feature. Polygons (e.g. area runs) are drawn by outline. */
export function featureLines(geometry: Geometry | null): LatLng[][] {
  if (!geometry) return [];
  switch (geometry.type) {
    case 'LineString':
      return [geometry.coordinates.map(toLatLng)];
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates.map((line) => line.map(toLatLng));
    case 'MultiPolygon':
      return geometry.coordinates.flatMap((poly) => poly.map((line) => line.map(toLatLng)));
    default:
      return [];
  }
}

function centerOf(geometry: Geometry | null): LatLng | null {
  if (!geometry) return null;
  if (geometry.type === 'Point') return toLatLng(geometry.coordinates);
  const points = featureLines(geometry).flat();
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ latitude: acc.latitude + p.latitude, longitude: acc.longitude + p.longitude }),
    { latitude: 0, longitude: 0 },
  );
  return { latitude: sum.latitude / points.length, longitude: sum.longitude / points.length };
}

const MAX_BBOX_KM2 = 1000; // API limit
const KM_PER_DEG_LAT = 111.32;

/**
 * Bounding box ("minLon,minLat,maxLon,maxLat") of `radiusKm` around a point,
 * shrunk if needed to stay inside the API's 1000 km² limit.
 */
export function bboxAround({ latitude, longitude }: LatLng, radiusKm = 7): string {
  const maxRadius = Math.sqrt(MAX_BBOX_KM2 * 0.95) / 2;
  const r = Math.min(radiusKm, maxRadius);
  const dLat = r / KM_PER_DEG_LAT;
  const dLon = r / (KM_PER_DEG_LAT * Math.max(Math.cos((latitude * Math.PI) / 180), 0.01));
  const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
  const clampLon = (v: number) => Math.max(-180, Math.min(180, v));
  return [
    clampLon(longitude - dLon),
    clampLat(latitude - dLat),
    clampLon(longitude + dLon),
    clampLat(latitude + dLat),
  ]
    .map((n) => n.toFixed(5))
    .join(',');
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`OpenSkiMap request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function parseSkiMapFeatures(features: Feature[]): SkiMapData {
  const runs: SkiMapRun[] = [];
  const lifts: SkiMapLift[] = [];
  for (const feature of features) {
    const props = feature.properties ?? {};
    const lines = featureLines(feature.geometry).filter((line) => line.length > 1);
    if (lines.length === 0) continue;
    const id = String(props.id ?? `${runs.length + lifts.length}`);
    const name = typeof props.name === 'string' ? props.name : null;
    if (props.type === 'run') {
      const uses = Array.isArray(props.uses) ? (props.uses as string[]) : [];
      // Only downhill-relevant runs; skip nordic tracks, sled runs, etc.
      if (uses.length > 0 && !uses.some((u) => u === 'downhill' || u === 'snow_park' || u === 'connection')) {
        continue;
      }
      runs.push({ id, name, difficulty: (props.difficulty as RunDifficulty | null) ?? null, lines });
    } else if (props.type === 'lift') {
      lifts.push({ id, name, liftType: typeof props.liftType === 'string' ? props.liftType : null, lines });
    }
  }
  return { runs, lifts };
}

/** Runs and lifts around a resort. */
export async function fetchSkiMap(center: LatLng, signal?: AbortSignal): Promise<SkiMapData> {
  const bbox = bboxAround(center);
  const collection = await getJson<{ features?: Feature[] }>(
    `/features.geojson?bbox=${bbox}&types=run,lift`,
    signal,
  );
  return parseSkiMapFeatures(collection.features ?? []);
}

/** Search OpenSkiMap for ski areas by name (returns up to 10 results). */
export async function searchSkiAreas(query: string, signal?: AbortSignal): Promise<SkiAreaSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const results = await getJson<Feature[] | { features?: Feature[] }>(
    `/search?query=${encodeURIComponent(trimmed)}`,
    signal,
  );
  const features = Array.isArray(results) ? results : (results.features ?? []);
  return features
    .filter((f) => f.properties?.type === 'skiArea')
    .flatMap((f) => {
      const center = centerOf(f.geometry);
      if (!center || !f.properties.name) return [];
      const places = Array.isArray(f.properties.places)
        ? (f.properties.places as { localized?: { en?: { region?: string; country?: string } } }[])
        : [];
      const place = places[0]?.localized?.en;
      const location = [place?.region, place?.country].filter(Boolean).join(', ') || null;
      return [{ id: String(f.properties.id), name: String(f.properties.name), location, center }];
    });
}

export const RUN_COLORS: Record<RunDifficulty | 'unknown', string> = {
  novice: '#2E9E4F',
  easy: '#2E9E4F',
  intermediate: '#1E62D0',
  advanced: '#111111',
  expert: '#111111',
  freeride: '#E07A10',
  extreme: '#C62828',
  unknown: '#7A8794',
};

export const LIFT_COLOR = '#C62828';

export function runColor(difficulty: RunDifficulty | null): string {
  return RUN_COLORS[difficulty ?? 'unknown'];
}

/** Distance in km between two points (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
