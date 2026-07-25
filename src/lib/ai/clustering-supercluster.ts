import Supercluster from "supercluster";
import type { Cluster, GeoPoint, HeatCell } from "./clustering-types";
import { buildHeatmapGrid } from "./clustering-grid";

type Props = { id: string; weight?: number; rag?: string; label?: string };

/**
 * Production-grade map clustering via Supercluster (Mapbox).
 */
export function clusterPointsSupercluster(
  points: GeoPoint[],
  opts?: { radius?: number; maxZoom?: number; zoom?: number }
): Cluster[] {
  if (!points.length) return [];

  const index = new Supercluster<Props>({
    radius: opts?.radius ?? 60,
    maxZoom: opts?.maxZoom ?? 16,
  });

  index.load(
    points.map((p) => ({
      type: "Feature" as const,
      properties: {
        id: p.id,
        weight: p.weight,
        rag: p.rag,
        label: p.label,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [p.lng, p.lat] as [number, number],
      },
    }))
  );

  // Zoom ~7 groups Uganda district-scale points without over-fragmenting
  const zoom = opts?.zoom ?? 7;
  const features = index.getClusters([-180, -85, 180, 85], zoom);

  return features.map((f, i) => {
    const [lng, lat] = f.geometry.coordinates;
    const props = f.properties as Props & {
      cluster?: boolean;
      cluster_id?: number;
      point_count?: number;
    };

    if (props.cluster && typeof props.cluster_id === "number") {
      const kids = index.getLeaves(props.cluster_id, Infinity);
      const pts: GeoPoint[] = kids.map((k) => {
        const [klng, klat] = k.geometry.coordinates;
        const kp = k.properties;
        return {
          id: kp.id,
          lat: klat,
          lng: klng,
          weight: kp.weight,
          rag: kp.rag,
          label: kp.label,
        };
      });
      const ragCounts: Record<string, number> = {};
      for (const p of pts) {
        if (p.rag) ragCounts[p.rag] = (ragCounts[p.rag] || 0) + 1;
      }
      const dominantRag = Object.entries(ragCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        id: `sc_${props.cluster_id}`,
        lat,
        lng,
        count: props.point_count ?? pts.length,
        points: pts,
        dominantRag,
      };
    }

    return {
      id: props.id || `pt_${i}`,
      lat,
      lng,
      count: 1,
      points: [
        {
          id: props.id,
          lat,
          lng,
          weight: props.weight,
          rag: props.rag,
          label: props.label,
        },
      ],
      dominantRag: props.rag,
    };
  });
}

/** Heatmap stays grid-based; Supercluster upgrades point clustering only. */
export function buildHeatmapSupercluster(
  points: Array<GeoPoint & { needWeight?: number }>,
  gridSize = 0.08
): HeatCell[] {
  return buildHeatmapGrid(points, gridSize);
}
