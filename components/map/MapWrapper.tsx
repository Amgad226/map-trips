"use client";

import dynamic from "next/dynamic";
import { Trip } from "@prisma/client";

const Map = dynamic(() => import("./Map"), { ssr: false });

interface MapWrapperProps {
  trips: Trip[];
}

export default function MapWrapper({ trips }: MapWrapperProps) {
  return <Map trips={trips} />;
}
