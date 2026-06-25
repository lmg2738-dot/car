"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { readJsonResponse } from "@/lib/api/client";

type StorageHealth = {
  ok: boolean;
  backend?: string;
  hint?: string | null;
  error?: string;
};

export function StorageHealthBanner() {
  const [health, setHealth] = useState<StorageHealth | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storage/health", { cache: "no-store" });
        const data = await readJsonResponse<StorageHealth>(res);
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) {
          setHealth({ ok: false, hint: "Supabase 저장소 상태를 확인하지 못했습니다." });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!health || health.ok) return null;

  const message =
    health.hint ??
    health.error ??
    "Supabase 환경 변수를 확인한 뒤 재배포하세요.";

  return (
    <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Supabase 저장소가 준비되지 않았습니다</p>
        <p className="mt-1 text-amber-800">{message}</p>
      </div>
    </div>
  );
}
