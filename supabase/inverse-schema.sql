-- ============================================================================
-- WCAG Master - Schema Destructor (Inverse Schema)
-- ============================================================================
-- Version: 1.0
-- Created: 2025-11-24
-- Description: Complete teardown script for WCAG Master database
--              Drops all tables, functions, triggers, policies, and extensions
--              in reverse dependency order with CASCADE
-- ============================================================================
-- ⚠️  WARNING: THIS SCRIPT WILL PERMANENTLY DELETE ALL DATA
-- ============================================================================

-- Disable query logging for cleanup (optional, for performance)
SET client_min_messages TO WARNING;

-- ============================================================================
-- DROP ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Drop RLS policies: WCAG issues
DROP POLICY IF EXISTS "Users can insert own wcag issues" ON public.wcag_issues;
DROP POLICY IF EXISTS "Users can view own wcag issues" ON public.wcag_issues;

-- Drop RLS policies: Quota usage
DROP POLICY IF EXISTS "Users can update own quota" ON public.quota_usage;
DROP POLICY IF EXISTS "Users can insert own quota" ON public.quota_usage;
DROP POLICY IF EXISTS "Users can view own quota" ON public.quota_usage;

-- Drop RLS policies: Iterations
DROP POLICY IF EXISTS "Users can delete own iterations" ON public.iterations;
DROP POLICY IF EXISTS "Users can update own iterations" ON public.iterations;
DROP POLICY IF EXISTS "Users can insert own iterations" ON public.iterations;
DROP POLICY IF EXISTS "Users can view own iterations" ON public.iterations;

-- Drop RLS policies: Uploads
DROP POLICY IF EXISTS "Users can delete own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can view own uploads" ON public.uploads;

-- Drop RLS policies: Users
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS increment_upload_iteration_count ON public.iterations;
DROP TRIGGER IF EXISTS update_quota_usage_updated_at ON public.quota_usage;
DROP TRIGGER IF EXISTS update_uploads_updated_at ON public.uploads;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;

-- ============================================================================
-- DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_stats(UUID);
DROP FUNCTION IF EXISTS increment_iteration_quota(UUID);
DROP FUNCTION IF EXISTS increment_upload_quota(UUID);
DROP FUNCTION IF EXISTS check_iteration_quota(UUID);
DROP FUNCTION IF EXISTS check_upload_quota(UUID);
DROP FUNCTION IF EXISTS cleanup_old_iterations();
DROP FUNCTION IF EXISTS increment_iteration_count();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- DROP TABLES (in reverse dependency order)
-- ============================================================================

-- Drop metadata table
DROP TABLE IF EXISTS public.schema_version CASCADE;

-- Drop child tables first (those with foreign key dependencies)
DROP TABLE IF EXISTS public.wcag_issues CASCADE;
DROP TABLE IF EXISTS public.quota_usage CASCADE;
DROP TABLE IF EXISTS public.iterations CASCADE;
DROP TABLE IF EXISTS public.uploads CASCADE;

-- Drop parent table last
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- DROP INDEXES (explicitly, though CASCADE should handle them)
-- ============================================================================

-- WCAG issues indexes
DROP INDEX IF EXISTS public.idx_wcag_criterion;
DROP INDEX IF EXISTS public.idx_wcag_type;
DROP INDEX IF EXISTS public.idx_wcag_severity;
DROP INDEX IF EXISTS public.idx_wcag_iteration_id;

-- Quota usage indexes
DROP INDEX IF EXISTS public.idx_quota_date;
DROP INDEX IF EXISTS public.idx_quota_user_date;

-- Iterations indexes
DROP INDEX IF EXISTS public.idx_iterations_rating;
DROP INDEX IF EXISTS public.idx_iterations_created;
DROP INDEX IF EXISTS public.idx_iterations_upload_number;
DROP INDEX IF EXISTS public.idx_iterations_upload_id;

-- Uploads indexes
DROP INDEX IF EXISTS public.idx_uploads_file_type;
DROP INDEX IF EXISTS public.idx_uploads_user_status;
DROP INDEX IF EXISTS public.idx_uploads_created;
DROP INDEX IF EXISTS public.idx_uploads_status;
DROP INDEX IF EXISTS public.idx_uploads_user_id;

-- Users indexes
DROP INDEX IF EXISTS public.idx_users_plan;
DROP INDEX IF EXISTS public.idx_users_email;
DROP INDEX IF EXISTS public.idx_users_auth_user_id;

-- ============================================================================
-- DROP EXTENSIONS (optional - only if not used by other schemas)
-- ============================================================================

-- Note: Extensions are database-wide, not schema-specific
-- Only drop if you're certain no other schemas/apps use them

-- DROP EXTENSION IF EXISTS "pg_trgm" CASCADE;
-- DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

-- ============================================================================
-- VERIFICATION QUERIES (optional - uncomment to verify cleanup)
-- ============================================================================

-- Verify all WCAG Master tables are dropped
-- SELECT tablename FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'uploads', 'iterations', 'quota_usage', 'wcag_issues', 'schema_version');

-- Verify all WCAG Master functions are dropped
-- SELECT routine_name FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN (
--   'update_updated_at_column', 
--   'increment_iteration_count', 
--   'cleanup_old_iterations',
--   'check_upload_quota',
--   'check_iteration_quota',
--   'increment_upload_quota',
--   'increment_iteration_quota',
--   'get_user_stats'
-- );

-- ============================================================================
-- RESET CLIENT MESSAGES
-- ============================================================================

RESET client_min_messages;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ WCAG Master schema successfully destroyed';
  RAISE NOTICE '✓ All tables, functions, triggers, policies, and indexes dropped';
  RAISE NOTICE '✓ Database reset to pre-installation state';
  RAISE NOTICE '';
  RAISE WARNING '⚠  ALL DATA HAS BEEN PERMANENTLY DELETED';
END $$;

-- ============================================================================
-- END OF INVERSE SCHEMA
-- ============================================================================
