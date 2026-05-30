"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { createParticipant } from "@/lib/actions/participantActions";

export default function NewParticipantPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData(e.currentTarget);
      await createParticipant(formData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("tripForm.error"));
      setLoading(false);
    } finally {
      if (preview) URL.revokeObjectURL(preview);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">{t("admin.newParticipant")}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-danger/10 p-4 text-sm text-danger border border-danger/20">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t("participant.name")}</label>
          <input
            name="name"
            type="text"
            required
            className="block w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
          />
        </div>

        {/* Image upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{t("participant.image")}</label>
          <input
            ref={fileInputRef}
            name="imageFile"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              preview
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/50 hover:bg-muted hover:border-border/80"
            }`}
          >
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-24 h-24 rounded-xl object-cover border border-border shadow-sm"
                />
                <span className="text-xs text-muted-foreground">{t("media.dropFiles")}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <span className="text-sm text-muted-foreground">{t("media.dropFiles")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
          >
            {loading ? t("tripForm.saving") : t("participant.create")}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/participants")}
            className="rounded-xl bg-muted px-6 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/80 transition-all"
          >
            {t("tripForm.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
