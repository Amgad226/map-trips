"use client";

import { Trip } from "@prisma/client";
import MapClient from "./MapClient";

interface MapProps {
  trips: Trip[];
}

export default function Map({ trips }: MapProps) {
  return <MapClient trips={trips} />;
}
