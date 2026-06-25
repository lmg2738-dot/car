"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Download, FolderTree, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import type { AihubDatasetItem, AihubPackageItem } from "@/lib/aihub/types";
import { cn } from "@/lib/utils";

type Tab = "datasets" | "packages";

export function AihubExplorer() {
  const [tab, setTab] = useState<Tab>("datasets");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<(AihubDatasetItem | AihubPackageItem)[]>([]);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [fileTree, setFileTree] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchList = useCallback(async (query?: string) => {
    const term = query ?? search;
    setLoading(true);
    setError(null);

    const endpoint =
      tab === "datasets"
        ? `/api/aihub/datasets${term ? `?search=${encodeURIComponent(term)}` : ""}`
        : `/api/aihub/packages${term ? `?search=${encodeURIComponent(term)}` : ""}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "조회 실패");
      }

      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    setSearch("");
    void fetchList("");
    // 탭 전환 시에만 자동 조회 (검색어 입력마다 호출하지 않음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function fetchFileTree(key: number) {
    setSelectedKey(key);
    setFileTree("");
    setLoading(true);
    setError(null);

    const param =
      tab === "datasets" ? `datasetkey=${key}` : `datapckagekey=${key}`;
    const endpoint =
      tab === "datasets"
        ? `/api/aihub/datasets?${param}`
        : `/api/aihub/packages?${param}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "파일 목록 조회 실패");
      }

      setFileTree(data.raw ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 목록 조회 실패");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(key: number) {
    setDownloading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/aihub/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tab === "datasets" ? "dataset" : "package",
          key,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "다운로드 실패");
      }

      setMessage(`다운로드 완료: ${data.outputDir}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "다운로드 실패");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
        {(
          [
            { id: "datasets" as const, label: "데이터셋", icon: Database },
            { id: "packages" as const, label: "데이터패키지", icon: FolderTree },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setSelectedKey(null);
              setFileTree("");
            }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              tab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <Card variant="elevated">
        <CardHeader
          icon={<Search className="h-5 w-5" />}
          title={tab === "datasets" ? "AI Hub 데이터셋" : "AI Hub 데이터패키지"}
          description="aihubshell API를 통해 개방 데이터를 조회·다운로드합니다."
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <FormField label="검색">
              <Input
                id="search"
                placeholder="키워드로 필터 (예: 이미지, 차량)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchList()}
              />
            </FormField>
          </div>
          <div className="flex items-end">
            <Button onClick={() => fetchList()} loading={loading} variant="primary">
              <Search className="h-4 w-4" />
              조회
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
            {message}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="elevated" className="p-0 overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h3 className="font-display text-lg">목록</h3>
            <p className="text-sm text-muted-foreground">{items.length}건</p>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {items.length === 0 && !loading && (
              <p className="p-6 text-sm text-muted-foreground">결과가 없습니다.</p>
            )}
            <ul>
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => fetchFileTree(item.key)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/50 px-6 py-3.5 text-left text-sm transition-colors last:border-0 hover:bg-muted/50",
                      selectedKey === item.key && "bg-primary/5"
                    )}
                  >
                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      {item.key}
                    </span>
                    <span className="text-foreground/90">{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card variant="elevated">
          <CardHeader
            title="파일 구조"
            action={
              selectedKey !== null ? (
                <Button
                  size="sm"
                  variant="accent"
                  loading={downloading}
                  onClick={() => handleDownload(selectedKey)}
                >
                  <Download className="h-4 w-4" />
                  전체 다운로드
                </Button>
              ) : undefined
            }
          />
          {selectedKey === null ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                목록에서 항목을 선택하면
                <br />
                파일 구조가 표시됩니다.
              </p>
            </div>
          ) : (
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-xl bg-muted/40 p-5 font-mono text-xs leading-relaxed">
              {fileTree || (loading ? "로딩 중..." : "파일 정보 없음")}
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
