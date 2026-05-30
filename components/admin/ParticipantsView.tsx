"use client";

import { useState } from "react";
import Link from "next/link";
import { Participant } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { getProxyUrl } from "@/lib/utils";

interface Props {
  participants: Participant[];
  onDelete: (id: number) => Promise<void>;
}

export default function ParticipantsView({ participants, onDelete }: Props) {
  const { t } = useTranslation();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    if (!confirm(t("actions.deleteConfirm"))) return;
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("admin.participants")}</h1>
        <Link
          href="/admin/participants/new"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          {t("admin.newParticipant")}
        </Link>
      </div>

      {participants.length === 0 ? (
        <div className="rounded-2xl bg-card p-12 text-center text-muted-foreground border border-border">
          <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-sm">{t("admin.noParticipants")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {participants.map((p) => (
            <div
              key={p.id}
              className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="relative aspect-square bg-muted">
                {p.image ? (
                  <img
                    src={getProxyUrl(p.image)}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-border">
                    <svg className="w-12 h-12 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                <p className="font-medium text-sm text-foreground text-center truncate">{p.name}</p>
                <div className="flex gap-1.5">
                  <Link
                    href={`/admin/participants/${p.id}`}
                    className="flex-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80 text-center transition-colors"
                  >
                    {t("actions.edit")}
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="flex-1 rounded-xl bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === p.id ? t("media.deleting") : t("media.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
