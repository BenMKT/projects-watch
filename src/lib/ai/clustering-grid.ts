import type { Cluster, GeoPoint, HeatCell } from "./clustering-types";

/** Simple grid bucketing — default / demo clustering. */
export function clusterPointsGrid(points: GeoPoint[], gridSize = 0.05): Cluster[] {
  const buckets = new Map<string, GeoPoint[]>();

  for (const p of points) {
    const key = `${Math.floor(p.lat / gridSize)}_${Math.floor(p.lng / gridSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }

  return Array.from(buckets.entries()).map(([key, pts]) => {
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    const ragCounts: Record<string, number> = {};
    for (const p of pts) {
      if (p.rag) ragCounts[p.rag] = (ragCounts[p.rag] || 0) + 1;
    }
    const dominantRag = Object.entries(ragCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    return { id: key, lat, lng, count: pts.length, points: pts, dominantRag };
  });
}

export function buildHeatmapGrid(
  points: Array<GeoPoint & { needWeight?: number }>,
  gridSize = 0.08
): HeatCell[] {
  const buckets = new Map<string, { lat: number; lng: number; intensity: number; n: number }>();

  for (const p of points) {
    const gx = Math.floor(p.lat / gridSize);
    const gy = Math.floor(p.lng / gridSize);
    const key = `${gx}_${gy}`;
    const existing = buckets.get(key) || {
      lat: gx * gridSize + gridSize / 2,
      lng: gy * gridSize + gridSize / 2,
      intensity: 0,
      n: 0,
    };
    existing.intensity += p.needWeight ?? p.weight ?? 1;
    existing.n += 1;
    buckets.set(key, existing);
  }

  const cells = Array.from(buckets.values());
  const max = Math.max(...cells.map((c) => c.intensity), 1);
  return cells.map((c) => ({
    lat: c.lat,
    lng: c.lng,
    intensity: c.intensity / max,
  }));
}
