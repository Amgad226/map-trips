"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { addKeyword, removeKeyword } from "@/lib/actions/keywordActions";

interface Keyword {
  id: number;
  value: string;
}

interface KeywordTagsProps {
  keywords: Keyword[];
  tripId?: number;
}

export default function KeywordTags({ keywords, tripId }: KeywordTagsProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const editable = tripId !== undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!input.trim() || !editable) return;

    startTransition(async () => {
      try {
        await addKeyword(tripId!, input.trim());
        setInput("");
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("keywords.failed"));
      }
    });
  }

  function handleRemove(keywordId: number) {
    if (!editable) return;
    startTransition(async () => {
      try {
        await removeKeyword(keywordId, tripId!);
        router.refresh();
      } catch {
        // ignore
      }
    });
  }

  return (
    <div className="space-y-3">
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw) => (
            <span
              key={kw.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              {kw.value}
              {editable && (
                <button
                  onClick={() => handleRemove(kw.id)}
                  disabled={isPending}
                  className="ml-0.5 text-primary/60 hover:text-primary disabled:opacity-50"
                  aria-label={`${t("keywords.remove")} ${kw.value}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {editable && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("keywords.placeholder")}
            maxLength={30}
            className="flex-1 min-w-0 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-all"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
          >
            {isPending ? t("keywords.adding") : t("keywords.add")}
          </button>
        </form>
      )}

      {editable && error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
