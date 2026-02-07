-- =============================================
-- Ora Platform - Row Level Security Policies
-- Replaces Firestore security rules
-- =============================================

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'user'::user_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() = 'teacher';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin_or_teacher()
RETURNS BOOLEAN AS $$
  SELECT public.get_user_role() IN ('admin', 'teacher');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- Auto-update updated_at trigger function
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.onboarding_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- Auto-create user profile on auth signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_practice_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gratitude_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLICIES: users
-- Admin: full access | Owner: read/update own profile
-- =============================================
CREATE POLICY "users_admin_select" ON public.users FOR SELECT TO authenticated
  USING (public.is_admin() OR id = auth.uid());
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR id = auth.uid());
CREATE POLICY "users_admin_update" ON public.users FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY "users_self_update" ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY "users_admin_delete" ON public.users FOR DELETE TO authenticated
  USING (public.is_admin());

-- =============================================
-- POLICIES: programs
-- Published: all authenticated | Draft/Archived: admin or author
-- =============================================
CREATE POLICY "programs_select" ON public.programs FOR SELECT TO authenticated
  USING (
    status = 'published'
    OR public.is_admin()
    OR (public.is_teacher() AND author_id = auth.uid())
  );
CREATE POLICY "programs_insert" ON public.programs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR (public.is_teacher() AND author_id = auth.uid())
  );
CREATE POLICY "programs_update" ON public.programs FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_teacher() AND author_id = auth.uid())
  );
CREATE POLICY "programs_delete" ON public.programs FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_teacher() AND author_id = auth.uid())
  );

-- =============================================
-- POLICIES: lessons
-- Read: all authenticated | Write: admin/teacher
-- =============================================
CREATE POLICY "lessons_select" ON public.lessons FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "lessons_insert" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_teacher());
CREATE POLICY "lessons_update" ON public.lessons FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_teacher() AND author_id = auth.uid())
  );
CREATE POLICY "lessons_delete" ON public.lessons FOR DELETE TO authenticated
  USING (public.is_admin());

-- =============================================
-- POLICIES: subcategories
-- Read: all authenticated | Write: admin only
-- =============================================
CREATE POLICY "subcategories_select" ON public.subcategories FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "subcategories_insert" ON public.subcategories FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "subcategories_update" ON public.subcategories FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY "subcategories_delete" ON public.subcategories FOR DELETE TO authenticated
  USING (public.is_admin());

-- =============================================
-- POLICIES: audit_logs
-- Read: admin only | Write: service_role only (server-side)
-- =============================================
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin());
-- Service role bypasses RLS, so no INSERT policy needed for server writes

-- =============================================
-- POLICIES: onboarding_configs
-- Read: active for all, all for admin/teacher | Write: admin only
-- =============================================
CREATE POLICY "onboarding_select" ON public.onboarding_configs FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR public.is_admin()
    OR public.is_teacher()
  );
CREATE POLICY "onboarding_insert" ON public.onboarding_configs FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());
CREATE POLICY "onboarding_update" ON public.onboarding_configs FOR UPDATE TO authenticated
  USING (public.is_admin());
CREATE POLICY "onboarding_delete" ON public.onboarding_configs FOR DELETE TO authenticated
  USING (public.is_admin() AND status != 'active');

-- =============================================
-- POLICIES: user_sessions (private per user)
-- =============================================
CREATE POLICY "sessions_select" ON public.user_sessions FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "sessions_insert" ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_delete" ON public.user_sessions FOR DELETE TO authenticated
  USING (public.is_admin());

-- =============================================
-- POLICIES: user_practice_stats (private per user)
-- =============================================
CREATE POLICY "practice_stats_select" ON public.user_practice_stats FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "practice_stats_upsert" ON public.user_practice_stats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "practice_stats_update" ON public.user_practice_stats FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLICIES: user_daily_journal (private per user)
-- =============================================
CREATE POLICY "journal_select" ON public.user_daily_journal FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "journal_insert" ON public.user_daily_journal FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "journal_update" ON public.user_daily_journal FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLICIES: user_stats (private per user)
-- =============================================
CREATE POLICY "user_stats_select" ON public.user_stats FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "user_stats_upsert" ON public.user_stats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_stats_update" ON public.user_stats FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLICIES: gratitude_entries (private per user)
-- =============================================
CREATE POLICY "gratitude_select" ON public.gratitude_entries FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "gratitude_insert" ON public.gratitude_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "gratitude_delete" ON public.gratitude_entries FOR DELETE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- =============================================
-- POLICIES: user_program_enrollments (private per user)
-- =============================================
CREATE POLICY "enrollments_select" ON public.user_program_enrollments FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "enrollments_insert" ON public.user_program_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "enrollments_update" ON public.user_program_enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "enrollments_delete" ON public.user_program_enrollments FOR DELETE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- =============================================
-- POLICIES: media
-- Read: all authenticated | Write: admin/teacher
-- =============================================
CREATE POLICY "media_select" ON public.media FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "media_insert" ON public.media FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_teacher());
CREATE POLICY "media_delete" ON public.media FOR DELETE TO authenticated
  USING (public.is_admin());

-- =============================================
-- POLICIES: command_logs (admin only)
-- =============================================
CREATE POLICY "command_logs_select" ON public.command_logs FOR SELECT TO authenticated
  USING (public.is_admin());
-- Service role bypasses RLS for inserts

-- =============================================
-- POLICIES: email_logs (admin only for read)
-- =============================================
CREATE POLICY "email_logs_select" ON public.email_logs FOR SELECT TO authenticated
  USING (public.is_admin());
-- Service role bypasses RLS for inserts

-- =============================================
-- POLICIES: email_preferences (private per user)
-- =============================================
CREATE POLICY "email_prefs_select" ON public.email_preferences FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
CREATE POLICY "email_prefs_insert" ON public.email_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "email_prefs_update" ON public.email_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- POLICIES: user_recommendations (private per user)
-- =============================================
CREATE POLICY "recommendations_select" ON public.user_recommendations FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());
-- Service role bypasses RLS for inserts (recommendations are generated server-side)
