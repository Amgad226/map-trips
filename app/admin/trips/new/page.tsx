"use client";

import { useTranslation } from "react-i18next";
import TripForm from "@/components/admin/TripForm";
import { createTrip } from "@/lib/actions/tripActions";

export default function NewTripPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t("admin.createTrip")}</h1>
      <TripForm action={createTrip} />
    </div>
  );
}
