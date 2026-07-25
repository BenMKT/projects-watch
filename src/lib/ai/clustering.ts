import { getClusterProvider } from "./providers";
import { buildHeatmapGrid, clusterPointsGrid } from "./clustering-grid";
import { buildHeatmapSupercluster, clusterPointsSupercluster } from "./clustering-supercluster";
import type { Cluster, GeoPoint, HeatCell } from "./clustering-types";

export type { Cluster, GeoPoint, HeatCell } from "./clustering-types";

/**
 * Pluggable geoclustering.
 * - CLUSTER_PROVIDER=grid         → simple grid (default, demo)
 * - CLUSTER_PROVIDER=supercluster → Mapbox Supercluster (production maps)
 */
export function clusterPoints(points: GeoPoint[], gridSize = 0.05): Cluster[] {
  if (getClusterProvider() === "supercluster") {
    return clusterPointsSupercluster(points);
  }
  return clusterPointsGrid(points, gridSize);
}

/** Build heat map intensity cells from geo + sentiment/RAG weights */
export function buildHeatmap(
  points: Array<GeoPoint & { needWeight?: number }>,
  gridSize = 0.08
): HeatCell[] {
  if (getClusterProvider() === "supercluster") {
    return buildHeatmapSupercluster(points, gridSize);
  }
  return buildHeatmapGrid(points, gridSize);
}
