-- AutoDealer Copilot — Supabase 스키마
-- Supabase Dashboard → SQL Editor에서 아래 전체를 실행하세요.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 차량
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand TEXT,
  model TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2030),
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  color TEXT,
  fuel_type TEXT,
  transmission TEXT,
  price_estimate_min INTEGER,
  price_estimate_max INTEGER,
  condition_summary JSONB,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'analyzing', 'ready', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 차량 사진
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  photo_type TEXT NOT NULL DEFAULT 'other'
    CHECK (photo_type IN ('exterior', 'interior', 'detail', 'other')),
  analysis_result JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 생성된 판매글
CREATE TABLE IF NOT EXISTS generated_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL
    CHECK (platform IN ('naver_cafe', 'encar', 'kb_chachacha', 'general')),
  style TEXT NOT NULL
    CHECK (style IN ('professional', 'friendly', 'premium', 'export')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ad_copy TEXT NOT NULL,
  faq JSONB NOT NULL DEFAULT '[]',
  purchase_points JSONB NOT NULL DEFAULT '[]',
  market_price JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle ON vehicle_photos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_generated_ads_vehicle ON generated_ads(vehicle_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vehicles_updated_at ON vehicles;
CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage: 차량 사진 (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-photos',
  'vehicle-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
