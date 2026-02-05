-- =============================================
-- Ora Platform - PostgreSQL Indexes
-- Equivalent of Firestore composite indexes
-- =============================================

-- users
CREATE INDEX idx_users_role_created ON public.users(role, created_at DESC);
CREATE INDEX idx_users_is_fake_created ON public.users(is_fake, created_at DESC);
CREATE INDEX idx_users_plan_tier_created ON public.users(plan_tier, created_at DESC);
CREATE INDEX idx_users_email ON public.users(email);

-- programs
CREATE INDEX idx_programs_author_status_created ON public.programs(author_id, status, created_at DESC);
CREATE INDEX idx_programs_status_category_created ON public.programs(status, category, created_at DESC);
CREATE INDEX idx_programs_category_difficulty_status ON public.programs(category, difficulty, status);
CREATE INDEX idx_programs_author_created ON public.programs(author_id, created_at DESC);
CREATE INDEX idx_programs_category_created ON public.programs(category, created_at DESC);
CREATE INDEX idx_programs_status_created ON public.programs(status, created_at DESC);

-- lessons
CREATE INDEX idx_lessons_program_updated ON public.lessons(program_id, updated_at DESC);
CREATE INDEX idx_lessons_status_updated ON public.lessons(status, updated_at DESC);
CREATE INDEX idx_lessons_type_updated ON public.lessons(type, updated_at DESC);
CREATE INDEX idx_lessons_author_updated ON public.lessons(author_id, updated_at DESC);
CREATE INDEX idx_lessons_subcategory ON public.lessons(subcategory_id);

-- Full-text search for lessons (trigram-based for i18n)
CREATE INDEX idx_lessons_title_fr_trgm ON public.lessons USING gin (title_fr gin_trgm_ops);
CREATE INDEX idx_lessons_title_en_trgm ON public.lessons USING gin (title_en gin_trgm_ops);
CREATE INDEX idx_lessons_title_es_trgm ON public.lessons USING gin (title_es gin_trgm_ops);

-- subcategories
CREATE INDEX idx_subcategories_category ON public.subcategories(category);
CREATE INDEX idx_subcategories_status ON public.subcategories(status);

-- user_sessions
CREATE INDEX idx_sessions_user_created ON public.user_sessions(user_id, created_at DESC);
CREATE INDEX idx_sessions_practice_started ON public.user_sessions(practice_type, started_at DESC);

-- user_program_enrollments
CREATE INDEX idx_enrollments_user_started ON public.user_program_enrollments(user_id, started_at DESC);
CREATE INDEX idx_enrollments_completed_day ON public.user_program_enrollments(is_completed, current_day DESC);

-- audit_logs
CREATE INDEX idx_audit_actor_created ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_action_created ON public.audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_resource_type_created ON public.audit_logs(resource_type, created_at DESC);
CREATE INDEX idx_audit_resource_id_created ON public.audit_logs(resource_id, created_at DESC);
CREATE INDEX idx_audit_type_action_created ON public.audit_logs(resource_type, action, created_at DESC);

-- gratitude_entries
CREATE INDEX idx_gratitude_user_created ON public.gratitude_entries(user_id, created_at DESC);

-- email_logs
CREATE INDEX idx_email_logs_type_created ON public.email_logs(email_type, created_at DESC);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_uid, created_at DESC);

-- media
CREATE INDEX idx_media_upload_type ON public.media(upload_type, created_at DESC);
CREATE INDEX idx_media_uploaded_by ON public.media(uploaded_by, created_at DESC);
