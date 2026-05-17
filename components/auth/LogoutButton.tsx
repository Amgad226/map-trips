"use client";

import { signOut } from "next-auth/react";
import { useTranslation } from "react-i18next";

export default function LogoutButton() {
  const { t } = useTranslation();

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="rounded-xl bg-danger/10 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/20 transition-all"
    >
      {t("auth.signOut")}
    </button>
  );
}
