"use client";

import dynamic from "next/dynamic";
import { Station, Trip } from "@prisma/client";

const Map = dynamic(() => import("./Map"), { ssr: false });

interface MapWrapperProps {
  stations: (Station & { trip: Trip; _count: { media: number } })[];
}

export default function MapWrapper({ stations }: MapWrapperProps) {
  return <Map stations={stations} />;
}
