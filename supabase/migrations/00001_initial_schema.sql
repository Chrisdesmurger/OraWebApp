-- =============================================
-- Ora Platform - Initial PostgreSQL Schema
-- Migration from Firebase/Firestore to Supabase
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- For trigram-based text search

-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'viewer', 'user');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE lesson_status AS ENUM ('draft', 'uploading', 'processing', 'ready', 'failed');
CREATE TYPE lesson_type AS ENUM ('video', 'audio');
CREATE TYPE category_type AS ENUM ('yoga', 'pilates', 'meditation', 'respiration', 'auto-massage');
CREATE TYPE difficulty_type AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE plan_tier AS ENUM ('free', 'premium', 'lifetime');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'role_change', 'status_change', 'email_sent', 'email_send_failed');
CREATE TYPE resource_type AS ENUM ('user', 'program', 'lesson', 'onboarding_config', 'subcategory', 'email');
CREATE TYPE onboarding_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE subcategory_status AS ENUM ('active', 'inactive');

-- =============================================
-- TABLE: users
-- Supabase Auth handles authentication (auth.users)
-- This table stores application-level profile data
-- =============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  role user_role DEFAULT 'user',
  plan_tier plan_tier DEFAULT 'free',
  language TEXT DEFAULT 'fr',
  is_fake BOOLEAN DEFAULT false,
  disabled BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: programs
-- =============================================
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  category category_type NOT NULL,
  difficulty difficulty_type NOT NULL,
  duration_days INT NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  cover_image_url TEXT,
  cover_storage_path TEXT,
  status content_status DEFAULT 'draft',
  author_id UUID NOT NULL REFERENCES public.users(id),
  tags TEXT[] DEFAULT '{}',
  lessons UUID[] DEFAULT '{}',
  media_count INT DEFAULT 0,
  scheduled_publish_at TIMESTAMPTZ,
  scheduled_archive_at TIMESTAMPTZ,
  auto_publish_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: lessons (with i18n via column suffixes)
-- =============================================
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- i18n fields (FR required, EN/ES optional)
  title_fr TEXT NOT NULL,
  title_en TEXT,
  title_es TEXT,
  description_fr TEXT,
  description_en TEXT,
  description_es TEXT,
  category_fr TEXT,
  category_en TEXT,
  category_es TEXT,
  transcript_fr TEXT,
  transcript_en TEXT,
  transcript_es TEXT,
  ambient_sound_name_fr TEXT,
  ambient_sound_name_en TEXT,
  ambient_sound_name_es TEXT,
  breathing_instruction_fr TEXT,
  breathing_instruction_en TEXT,
  breathing_instruction_es TEXT,
  -- Core fields
  type lesson_type NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  "order" INT DEFAULT 0,
  duration_sec INT,
  tags TEXT[] DEFAULT '{}',
  status lesson_status DEFAULT 'draft',
  -- Media fields
  storage_path_original TEXT,
  renditions JSONB DEFAULT '{}',
  audio_variants JSONB DEFAULT '{}',
  codec TEXT,
  size_bytes BIGINT,
  mime_type TEXT,
  thumbnail_url TEXT,
  preview_image_url TEXT,
  preview_storage_path TEXT,
  -- Metadata
  author_id UUID REFERENCES public.users(id),
  subcategory_id UUID,
  subcategory_slug TEXT,
  -- Specialized content (JSONB for flexibility)
  chapters JSONB,
  body_zones JSONB,
  phases JSONB,
  yoga_poses JSONB,
  -- Aspect ratio (transcoding)
  source_aspect_ratio TEXT,
  output_aspect_ratio TEXT,
  aspect_conversion_mode TEXT,
  -- Scheduling
  scheduled_publish_at TIMESTAMPTZ,
  scheduled_archive_at TIMESTAMPTZ,
  auto_publish_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: subcategories
-- =============================================
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category category_type NOT NULL,
  name_fr TEXT NOT NULL CHECK (char_length(name_fr) BETWEEN 2 AND 100),
  name_en TEXT,
  name_es TEXT,
  description_fr TEXT,
  description_en TEXT,
  description_es TEXT,
  slug TEXT NOT NULL CHECK (char_length(slug) BETWEEN 2 AND 100),
  display_order INT DEFAULT 0,
  icon_url TEXT,
  status subcategory_status DEFAULT 'active',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, slug)
);

-- =============================================
-- TABLE: audit_logs
-- =============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action audit_action NOT NULL,
  resource_type resource_type NOT NULL,
  resource_id TEXT NOT NULL,
  actor_id UUID REFERENCES public.users(id),
  actor_email TEXT,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: onboarding_configs
-- =============================================
CREATE TABLE public.onboarding_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  status onboarding_status DEFAULT 'draft',
  version TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  information_screens JSONB DEFAULT '[]',
  recommendation_rules JSONB DEFAULT '[]',
  created_by UUID REFERENCES public.users(id),
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: user_sessions (replaces sub-collection users/{uid}/sessions)
-- =============================================
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practice_type TEXT,
  started_at TIMESTAMPTZ,
  duration_sec INT,
  lesson_id UUID REFERENCES public.lessons(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: user_practice_stats (replaces sub-collection practiceStats)
-- =============================================
CREATE TABLE public.user_practice_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  practice_type TEXT NOT NULL,
  total_sessions INT DEFAULT 0,
  total_duration_sec INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, practice_type)
);

-- =============================================
-- TABLE: user_daily_journal (replaces sub-collection dailyJournal)
-- =============================================
CREATE TABLE public.user_daily_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- =============================================
-- TABLE: user_stats (replaces collection stats/{uid})
-- =============================================
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- =============================================
-- TABLE: gratitude_entries (replaces gratitudes/{uid}/entries)
-- =============================================
CREATE TABLE public.gratitude_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- =============================================
-- TABLE: user_program_enrollments (replaces user_programs/{uid}/enrolled)
-- =============================================
CREATE TABLE public.user_program_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  current_day INT DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, program_id)
);

-- =============================================
-- TABLE: media
-- =============================================
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES public.users(id),
  linked_to TEXT,
  upload_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: command_logs
-- =============================================
CREATE TABLE public.command_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  executed_by JSONB,
  output TEXT,
  error TEXT,
  duration_ms INT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: email_logs
-- =============================================
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type TEXT NOT NULL,
  recipient_uid UUID REFERENCES public.users(id),
  recipient_email TEXT,
  language TEXT DEFAULT 'fr',
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TABLE: email_preferences
-- =============================================
CREATE TABLE public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  marketing BOOLEAN DEFAULT true,
  digest BOOLEAN DEFAULT true,
  inactivity BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- =============================================
-- TABLE: user_recommendations
-- =============================================
CREATE TABLE public.user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recommendations JSONB,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
