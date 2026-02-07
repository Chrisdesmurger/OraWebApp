-- =============================================
-- Extra tables for Firebase collections not in original schema
-- daily_needs_categories, email_stats, email_tracking
-- =============================================

-- Daily Needs Categories (from Firebase daily_needs_categories collection)
CREATE TABLE IF NOT EXISTS public.daily_needs_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_fr TEXT,
  name_en TEXT,
  description_fr TEXT,
  description_en TEXT,
  icon_url TEXT,
  color_hex TEXT,
  filter_tags TEXT[] DEFAULT '{}',
  lesson_ids TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email Stats (daily aggregated email metrics)
CREATE TABLE IF NOT EXISTS public.email_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  sent INT DEFAULT 0,
  delivered INT DEFAULT 0,
  opened INT DEFAULT 0,
  clicked INT DEFAULT 0,
  bounced INT DEFAULT 0,
  complained INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email Tracking (individual email events from Resend webhooks)
CREATE TABLE IF NOT EXISTS public.email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id TEXT,
  recipient_email TEXT,
  subject TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_needs_active_order ON daily_needs_categories(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_email_stats_date ON email_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_email_tracking_resend ON email_tracking(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_recipient ON email_tracking(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_tracking_type ON email_tracking(event_type, created_at DESC);

-- RLS
ALTER TABLE public.daily_needs_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;

-- Policies: daily_needs_categories (public read, admin write)
CREATE POLICY "Anyone can read active categories" ON daily_needs_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage categories" ON daily_needs_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Policies: email_stats (admin read, service write)
CREATE POLICY "Admin can read email stats" ON email_stats
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Service can insert email stats" ON email_stats
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service can update email stats" ON email_stats
  FOR UPDATE TO service_role USING (true);

-- Policies: email_tracking (admin read, service write)
CREATE POLICY "Admin can read email tracking" ON email_tracking
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Service can insert email tracking" ON email_tracking
  FOR INSERT TO service_role WITH CHECK (true);
