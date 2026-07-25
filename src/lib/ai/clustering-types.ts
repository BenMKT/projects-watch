export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
  weight?: number;
  rag?: string;
  label?: string;
}

export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  points: GeoPoint[];
  dominantRag?: string;
}

export interface HeatCell {
  lat: number;
  lng: number;
  intensity: number;
}
