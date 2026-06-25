-- AutoDealer Copilot — SaaS 멀티테넌트 스키마
-- 실행: supabase db push 또는 SQL Editor에서 순서대로 실행

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (테넌트)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles (auth.users 연동)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'analyzing', 'ready', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicle Photos
CREATE TABLE IF NOT EXISTS vehicle_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  photo_type TEXT NOT NULL DEFAULT 'other' CHECK (photo_type IN ('exterior', 'interior', 'detail', 'other')),
  analysis_result JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated Ads
CREATE TABLE IF NOT EXISTS generated_ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('naver_cafe', 'encar', 'kb_chachacha', 'general')),
  style TEXT NOT NULL CHECK (style IN ('professional', 'friendly', 'premium', 'export')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ad_copy TEXT NOT NULL,
  faq JSONB NOT NULL DEFAULT '[]',
  purchase_points JSONB NOT NULL DEFAULT '[]',
  market_price JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle ON vehicle_photos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_generated_ads_vehicle ON generated_ads(vehicle_id);

-- Updated_at trigger
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

-- RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_ads ENABLE ROW LEVEL SECURITY;

-- Helper: 현재 사용자의 organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations policies
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = get_user_organization_id());

-- Profiles policies
CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Vehicles policies
CREATE POLICY "Users can view org vehicles"
  ON vehicles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert org vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "Users can update org vehicles"
  ON vehicles FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete org vehicles"
  ON vehicles FOR DELETE
  USING (organization_id = get_user_organization_id());

-- Vehicle photos policies
CREATE POLICY "Users can view org vehicle photos"
  ON vehicle_photos FOR SELECT
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert org vehicle photos"
  ON vehicle_photos FOR INSERT
  WITH CHECK (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can update org vehicle photos"
  ON vehicle_photos FOR UPDATE
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can delete org vehicle photos"
  ON vehicle_photos FOR DELETE
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE organization_id = get_user_organization_id()
    )
  );

-- Generated ads policies
CREATE POLICY "Users can view org generated ads"
  ON generated_ads FOR SELECT
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert org generated ads"
  ON generated_ads FOR INSERT
  WITH CHECK (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Users can delete org generated ads"
  ON generated_ads FOR DELETE
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE organization_id = get_user_organization_id()
    )
  );

-- 신규 사용자 자동 프로비저닝
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name, slug)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Dealership',
    'org-' || substr(NEW.id::text, 1, 8)
  )
  RETURNING id INTO new_org_id;

  INSERT INTO profiles (id, organization_id, email, full_name, role)
  VALUES (
    NEW.id,
    new_org_id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'owner'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
