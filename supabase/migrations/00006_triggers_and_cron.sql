-- =============================================
-- Ora Platform - Database Triggers & pg_cron Jobs
-- Migration 00006: Replaces Firebase Cloud Functions triggers
--
-- This migration sets up:
-- 1. pg_net extension for HTTP calls from within the database
-- 2. pg_cron extension for scheduled jobs
-- 3. Database trigger on users INSERT -> calls on-user-create Edge Function
-- 4. Database trigger on lessons UPDATE -> calls on-content-publish Edge Function
-- 5. pg_cron job: daily inactivity check at 9 AM UTC (Europe/Paris)
-- 6. pg_cron job: weekly digest every Sunday at 10 AM UTC (Europe/Paris)
--
-- Note: pg_cron uses UTC internally. The cron expressions below assume
-- the Supabase project timezone is configured accordingly.
-- Adjust offsets if needed (e.g., 9 AM Paris = 8 AM UTC in summer, 7 AM UTC in winter).
-- Using 8 AM UTC as a reasonable middle ground for Europe/Paris.
-- =============================================

-- Enable required extensions
-- pg_cron: for scheduling recurring jobs
-- pg_net: for making HTTP requests from SQL (used by triggers to call Edge Functions)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================
-- TRIGGER FUNCTION: notify_user_created
-- Called after INSERT on public.users
-- Sends an HTTP POST to the on-user-create Edge Function
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_user_created()
RETURNS trigger AS $$
BEGIN
  PERFORM extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/on-user-create',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'first_name', NEW.first_name,
      'language', COALESCE(NEW.language, 'fr')
    )
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but do not block the INSERT
  RAISE WARNING '[notify_user_created] Failed to call Edge Function: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.users for new user creation
-- Note: The existing on_auth_user_created trigger (from migration 00003)
-- creates the users row from auth.users. This trigger fires AFTER that
-- row is inserted into public.users.
CREATE TRIGGER on_user_created_notify
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_created();

-- =============================================
-- TRIGGER FUNCTION: notify_content_published
-- Called after UPDATE on public.lessons
-- Only fires the Edge Function when status changes TO 'ready'
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_content_published()
RETURNS trigger AS $$
BEGIN
  -- Only trigger if status changed from non-ready to 'ready'
  IF (OLD.status IS DISTINCT FROM 'ready') AND (NEW.status = 'ready') THEN
    PERFORM extensions.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/on-content-publish',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'lesson_id', NEW.id,
        'title_fr', NEW.title_fr,
        'title_en', NEW.title_en,
        'title_es', NEW.title_es,
        'description_fr', NEW.description_fr,
        'description_en', NEW.description_en,
        'description_es', NEW.description_es,
        'thumbnail_url', NEW.thumbnail_url,
        'author_id', NEW.author_id
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but do not block the UPDATE
  RAISE WARNING '[notify_content_published] Failed to call Edge Function: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on public.lessons for content publish events
CREATE TRIGGER on_content_published_notify
  AFTER UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_content_published();

-- =============================================
-- pg_cron: Daily inactivity check
-- Runs at 8:00 AM UTC (approximately 9 AM Europe/Paris)
-- Calls the inactivity-check Edge Function
-- =============================================
SELECT cron.schedule(
  'daily-inactivity-check',
  '0 8 * * *',
  $$
  SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/inactivity-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =============================================
-- pg_cron: Weekly digest
-- Runs at 9:00 AM UTC every Sunday (approximately 10 AM Europe/Paris)
-- Calls the weekly-digest Edge Function
-- =============================================
SELECT cron.schedule(
  'weekly-digest',
  '0 9 * * 0',
  $$
  SELECT extensions.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =============================================
-- INDEXES: Support the inactivity-check queries
-- These complement the existing indexes from migration 00002
-- =============================================

-- Index for finding users by last_login_at range (used by inactivity-check)
CREATE INDEX IF NOT EXISTS idx_users_last_login_at
  ON public.users(last_login_at)
  WHERE last_login_at IS NOT NULL;

-- Index for checking recent email logs by recipient and type (deduplication)
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_type_sent
  ON public.email_logs(recipient_uid, email_type, sent_at DESC);

-- =============================================
-- COMMENTS: Document the triggers and cron jobs
-- =============================================
COMMENT ON FUNCTION public.notify_user_created() IS
  'Calls the on-user-create Edge Function when a new user row is inserted. Sends welcome email.';

COMMENT ON FUNCTION public.notify_content_published() IS
  'Calls the on-content-publish Edge Function when a lesson status changes to ready. Sends notifications.';

COMMENT ON TRIGGER on_user_created_notify ON public.users IS
  'Fires after INSERT to send welcome email via Edge Function.';

COMMENT ON TRIGGER on_content_published_notify ON public.lessons IS
  'Fires after UPDATE when status changes to ready, sending content notification via Edge Function.';
