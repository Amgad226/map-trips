"use client";

import { Station, Trip } from "@prisma/client";
import MapClient from "./MapClient";

interface MapProps {
  stations: (Station & { trip: Trip; _count: { media: number } })[];
}

export default function Map({ stations }: MapProps) {
  return <MapClient stations={stations} />;
}
