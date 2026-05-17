"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

interface DeleteTripButtonProps {
  id: number;
  action: (id: number) => Promise<void>;
}

export default function DeleteTripButton({ id, action }: DeleteTripButtonProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await action(id);
    } catch {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{t("actions.deleteConfirm")}</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-danger-foreground hover:bg-danger/90 disabled:opacity-50 transition-all shadow-lg shadow-danger/20"
        >
          {loading ? t("media.deleting") : t("actions.yesDelete")}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/80 transition-all"
        >
          {t("tripForm.cancel")}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-xl bg-danger/10 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/20 transition-all"
    >
      {t("actions.deleteTrip")}
    </button>
  );
}
