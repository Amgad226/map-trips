"use client";

import { useState } from "react";
import { Participant, TripParticipant } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";

interface Props {
  tripParticipants: (TripParticipant & { participant: Participant })[];
  allParticipants: Participant[];
  onAdd: (participantId: number) => Promise<void>;
  onRemove: (participantId: number) => Promise<void>;
  onSetBest: (participantId: number | null) => Promise<void>;
}

export default function TripParticipantsManager({
  tripParticipants,
  allParticipants,
  onAdd,
  onRemove,
  onSetBest,
}: Props) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const tripParticipantIds = new Set(tripParticipants.map((tp) => tp.participantId));
  const availableParticipants = allParticipants.filter((p) => !tripParticipantIds.has(p.id));
  const bestParticipantId = tripParticipants.find((tp) => tp.isBest)?.participantId ?? null;

  async function handleAdd() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await onAdd(parseInt(selectedId, 10));
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(participantId: number) {
    if (!confirm(t("actions.deleteConfirm"))) return;
    setLoading(true);
    try {
      await onRemove(participantId);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetBest(participantId: number) {
    setLoading(true);
    try {
      await onSetBest(bestParticipantId === participantId ? null : participantId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Add participant */}
      <div className="flex items-center gap-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="">{t("participant.select")}</option>
          {availableParticipants.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!selectedId || loading}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
        >
          {t("participant.add")}
        </button>
      </div>

      {/* List */}
      {tripParticipants.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("participant.noParticipants")}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tripParticipants.map((tp) => {
            const isBest = tp.participantId === bestParticipantId;
            return (
              <div
                key={tp.participantId}
                className={`relative rounded-xl border-2 overflow-hidden bg-card transition-all ${
                  isBest ? "border-amber-400 ring-2 ring-amber-400/20" : "border-border"
                }`}
              >
                {/* Crown for best */}
                {isBest && (
                  <div className="absolute top-1.5 left-1.5 z-10">
                    <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-amber-900" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                      </svg>
                    </div>
                  </div>
                )}
                <div className="relative aspect-square bg-muted">
                  {tp.participant.image ? (
                    <img
                      src={getProxyUrl(tp.participant.image)}
                      alt={tp.participant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-border">
                      <svg className="w-10 h-10 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2.5 space-y-1.5">
                  <p className="font-medium text-xs text-foreground text-center truncate">{tp.participant.name}</p>
                  <button
                    onClick={() => handleSetBest(tp.participantId)}
                    disabled={loading}
                    className={`w-full rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                      isBest
                        ? "bg-amber-400/15 text-amber-600 hover:bg-amber-400/25"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    } disabled:opacity-50`}
                  >
                    {isBest ? "★ Best" : "Set Best"}
                  </button>
                  <button
                    onClick={() => handleRemove(tp.participantId)}
                    disabled={loading}
                    className="w-full rounded-lg bg-danger/10 px-2 py-1 text-[10px] font-medium text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors"
                  >
                    {t("media.delete")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
