-- =============================================
-- Fix ENUM types to match all TypeScript values
-- =============================================

-- Add missing audit_action values for onboarding
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'onboarding_created';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'onboarding_updated';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'onboarding_published';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'onboarding_deleted';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'onboarding_exported';

-- Add missing resource_type values
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'onboarding_responses';
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'email_template';
