"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { RAG_COLORS } from "@/lib/utils";
import Link from "next/link";

export interface MapProject {
  id: string;
  name: string;
  projectCode: string;
  latitude: number;
  longitude: number;
  finalRag: keyof typeof RAG_COLORS;
  district: string;
  contractor?: string;
}

function MapInner({ projects }: { projects: MapProject[] }) {
  const [Leaflet, setLeaflet] = useState<{
    MapContainer: typeof import("react-leaflet").MapContainer;
    TileLayer: typeof import("react-leaflet").TileLayer;
    Marker: typeof import("react-leaflet").Marker;
    Popup: typeof import("react-leaflet").Popup;
    CircleMarker: typeof import("react-leaflet").CircleMarker;
  } | null>(null);

  useEffect(() => {
    Promise.all([import("react-leaflet"), import("leaflet")]).then(([rl, L]) => {
      // Fix default marker icons in bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeaflet({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        Marker: rl.Marker,
        Popup: rl.Popup,
        CircleMarker: rl.CircleMarker,
      });
    });
  }, []);

  if (!Leaflet) {
    return (
      <div className="flex h-[480px] items-center justify-center rounded-xl bg-teal-900/5 text-sm text-teal-800">
        Loading map…
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = Leaflet;
  const center: [number, number] =
    projects.length > 0
      ? [projects[0].latitude, projects[0].longitude]
      : [0.3476, 32.5825]; // Kampala

  return (
    <MapContainer
      center={center}
      zoom={7}
      className="h-[480px] w-full rounded-xl z-0"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {projects.map((p) => {
        const color = RAG_COLORS[p.finalRag]?.hex || RAG_COLORS.PENDING.hex;
        return (
          <CircleMarker
            key={p.id}
            center={[p.latitude, p.longitude]}
            radius={10}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[160px] space-y-1 text-sm">
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-slate-600">{p.projectCode} · {p.district}</p>
                <p className="text-xs">
                  Status:{" "}
                  <span style={{ color }}>{RAG_COLORS[p.finalRag]?.label}</span>
                </p>
                <Link href={`/projects/${p.id}`} className="text-xs text-teal-700 underline">
                  View project
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export const ProjectMap = dynamic(() => Promise.resolve(MapInner), { ssr: false });
