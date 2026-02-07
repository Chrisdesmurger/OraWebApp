-- =============================================
-- Ora Platform - Supabase Storage Buckets & Policies
-- Replaces Firebase Storage rules
-- =============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('media-lessons', 'media-lessons', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('media-programs', 'media-programs', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('media-users', 'media-users', true);

-- =============================================
-- BUCKET: media-lessons
-- Public read (like Firebase: security through obscurity)
-- Teacher/Admin write (2GB max for originals)
-- =============================================
CREATE POLICY "media_lessons_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'media-lessons');

CREATE POLICY "media_lessons_teacher_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media-lessons'
    AND (public.is_admin() OR public.is_teacher())
  );

CREATE POLICY "media_lessons_teacher_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media-lessons'
    AND (public.is_admin() OR public.is_teacher())
  );

CREATE POLICY "media_lessons_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'media-lessons'
    AND public.is_admin()
  );

-- =============================================
-- BUCKET: media-programs
-- Public read for cover images
-- Teacher/Admin write (100MB max)
-- =============================================
CREATE POLICY "media_programs_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'media-programs');

CREATE POLICY "media_programs_teacher_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media-programs'
    AND (public.is_admin() OR public.is_teacher())
  );

CREATE POLICY "media_programs_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'media-programs'
    AND public.is_admin()
  );

-- =============================================
-- BUCKET: media-users
-- Public read for profile images
-- Owner write (5MB max)
-- =============================================
CREATE POLICY "media_users_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'media-users');

CREATE POLICY "media_users_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media-users'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "media_users_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'media-users'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );
