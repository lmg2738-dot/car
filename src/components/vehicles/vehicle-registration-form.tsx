"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Select, FormField } from "@/components/ui/input";
import { readJsonResponse } from "@/lib/api/client";

export function VehicleRegistrationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    const payload = {
      brand: (form.get("brand") as string) || undefined,
      model: form.get("model") as string,
      year: Number(form.get("year")),
      mileage: Number(form.get("mileage")),
      color: (form.get("color") as string) || undefined,
      fuel_type: (form.get("fuel_type") as string) || undefined,
      transmission: (form.get("transmission") as string) || undefined,
    };

    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await readJsonResponse<{ id: string; error?: string }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "등록에 실패했습니다.");
      }

      router.push(`/dashboard/vehicles/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card variant="elevated">
      <CardHeader
        icon={<Car className="h-5 w-5" />}
        title="차량 기본 정보"
        description="모델, 연식, 주행거리 등 기본 정보를 입력하세요."
      />
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <FormField label="브랜드" hint="예: 기아, 현대, BMW">
          <Input id="brand" name="brand" placeholder="기아" />
        </FormField>
        <FormField label="모델" required>
          <Input id="model" name="model" required placeholder="K5" />
        </FormField>
        <FormField label="연식" required>
          <Input
            id="year"
            name="year"
            type="number"
            required
            min={1990}
            max={2030}
            defaultValue={2022}
          />
        </FormField>
        <FormField label="주행거리 (km)" required>
          <Input
            id="mileage"
            name="mileage"
            type="number"
            required
            min={0}
            placeholder="43000"
          />
        </FormField>
        <FormField label="색상">
          <Input id="color" name="color" placeholder="흰색" />
        </FormField>
        <FormField label="연료">
          <Select id="fuel_type" name="fuel_type" defaultValue="">
            <option value="">선택</option>
            <option value="가솔린">가솔린</option>
            <option value="디젤">디젤</option>
            <option value="LPG">LPG</option>
            <option value="하이브리드">하이브리드</option>
            <option value="전기">전기</option>
          </Select>
        </FormField>
        <FormField label="변속기">
          <Select id="transmission" name="transmission" defaultValue="">
            <option value="">선택</option>
            <option value="자동">자동</option>
            <option value="수동">수동</option>
          </Select>
        </FormField>

        {error && (
          <div className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        <div className="sm:col-span-2 flex justify-end gap-3 border-t border-border pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            취소
          </Button>
          <Button type="submit" variant="accent" loading={loading}>
            등록하고 사진 업로드
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
}
