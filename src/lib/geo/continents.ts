// Coarse lat/lng → continent classifier for map aggregation labels.
// Continent borders are not actually rectangles; this is a heuristic chosen
// so that pins land in the obvious bucket 95%+ of the time. We use it only
// for the homepage/world-view cluster labels — never for any data semantics.

export type Continent =
  | "Africa"
  | "Europe"
  | "Asia"
  | "North America"
  | "South America"
  | "Oceania"
  | "Antarctica";

interface ContinentMeta {
  /** Approximate centroid lat/lng so cluster bubbles sit somewhere reasonable. */
  centroid: [number, number];
}

export const CONTINENT_CENTROIDS: Record<Continent, ContinentMeta> = {
  Africa: { centroid: [2, 20] },
  Europe: { centroid: [54, 15] },
  Asia: { centroid: [34, 95] },
  "North America": { centroid: [40, -100] },
  "South America": { centroid: [-15, -60] },
  Oceania: { centroid: [-25, 135] },
  Antarctica: { centroid: [-82, 0] },
};

/**
 * Classify a (lat,lng) point to a continent using rectangular regions.
 * Order matters — earlier checks are more specific.
 */
export function getContinentFromLatLng(lat: number, lng: number): Continent {
  if (lat <= -60) return "Antarctica";

  // North America: includes Mexico, Central America, Caribbean down to Panama.
  if (lat >= 7 && lng <= -55 && lng >= -170) return "North America";

  // South America: spans roughly -55 to 13 lat, -82 to -34 lng.
  if (lat < 13 && lat >= -56 && lng <= -34 && lng >= -82) return "South America";

  // Europe — west of the Urals, north of the Mediterranean.
  if (lat >= 36 && lat <= 72 && lng >= -25 && lng <= 60) return "Europe";

  // Africa — south of Med, west of Indian Ocean.
  if (lat <= 38 && lat >= -35 && lng >= -18 && lng <= 52) return "Africa";

  // Oceania — Australia, NZ, Pacific islands.
  if (lat <= 0 && lng >= 110) return "Oceania";
  if (lat >= -50 && lat <= -10 && lng >= 110) return "Oceania";

  // Default to Asia for the remaining Old World region.
  if (lat >= 0 && lng >= 25) return "Asia";

  // Catch-all (e.g. mid-Pacific antimeridian): treat as Oceania for nicety.
  return "Oceania";
}
