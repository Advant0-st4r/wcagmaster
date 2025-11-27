-- ============================================================================
-- WCAG Master - Complete Database Schema
-- ============================================================================
-- Version: 1.0
-- Created: 2025-11-24
-- Description: Full schema for WCAG accessibility analysis platform
--              Includes user management, file uploads, iterations, and quotas
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search performance

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  daily_upload_limit INTEGER NOT NULL DEFAULT 1,
  daily_iteration_limit INTEGER NOT NULL DEFAULT 3,
  total_uploads INTEGER NOT NULL DEFAULT 0,
  total_iterations INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Uploads table (original file submissions)
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('html', 'css', 'js', 'jsx', 'tsx', 'vue', 'svelte')),
  file_size_bytes INTEGER NOT NULL,
  original_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  iteration_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Iterations table (refined code versions)
CREATE TABLE IF NOT EXISTS public.iterations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  iteration_number INTEGER NOT NULL DEFAULT 1,
  refined_code TEXT NOT NULL,
  feedback TEXT,
  iteration_rating INTEGER CHECK (iteration_rating IS NULL OR (iteration_rating >= 1 AND iteration_rating <= 10)),
  analysis_results JSONB DEFAULT '{}'::jsonb,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(upload_id, iteration_number)
);

-- Quota tracking table (daily limits per user)
CREATE TABLE IF NOT EXISTS public.quota_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL DEFAULT CURRENT_DATE,
  uploads_count INTEGER NOT NULL DEFAULT 0,
  iterations_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, quota_date)
);

-- WCAG issues table (detailed accessibility problems found)
CREATE TABLE IF NOT EXISTS public.wcag_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  iteration_id UUID NOT NULL REFERENCES public.iterations(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'missing_alt', 'heading_hierarchy', 'contrast', 'missing_label', 
    'missing_landmark', 'keyboard_trap', 'aria_invalid', 'semantic_html', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
  wcag_criterion TEXT NOT NULL, -- e.g., "1.1.1", "1.4.3", "2.1.1"
  description TEXT NOT NULL,
  line_number INTEGER,
  element_selector TEXT,
  suggested_fix TEXT,
  auto_fixed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON public.users(plan);

-- Uploads indexes
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON public.uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON public.uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_created ON public.uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_user_status ON public.uploads(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_file_type ON public.uploads(file_type);

-- Iterations indexes
CREATE INDEX IF NOT EXISTS idx_iterations_upload_id ON public.iterations(upload_id);
CREATE INDEX IF NOT EXISTS idx_iterations_upload_number ON public.iterations(upload_id, iteration_number DESC);
CREATE INDEX IF NOT EXISTS idx_iterations_created ON public.iterations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iterations_rating ON public.iterations(iteration_rating) WHERE iteration_rating IS NOT NULL;

-- Quota usage indexes
CREATE INDEX IF NOT EXISTS idx_quota_user_date ON public.quota_usage(user_id, quota_date DESC);
CREATE INDEX IF NOT EXISTS idx_quota_date ON public.quota_usage(quota_date DESC);

-- WCAG issues indexes
CREATE INDEX IF NOT EXISTS idx_wcag_iteration_id ON public.wcag_issues(iteration_id);
CREATE INDEX IF NOT EXISTS idx_wcag_severity ON public.wcag_issues(severity);
CREATE INDEX IF NOT EXISTS idx_wcag_type ON public.wcag_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_wcag_criterion ON public.wcag_issues(wcag_criterion);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at for users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at for uploads
CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-update updated_at for quota_usage
CREATE TRIGGER update_quota_usage_updated_at
  BEFORE UPDATE ON public.quota_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Increment iteration count when new iteration created
CREATE OR REPLACE FUNCTION increment_iteration_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.uploads 
  SET iteration_count = iteration_count + 1
  WHERE id = NEW.upload_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-increment iteration count
CREATE TRIGGER increment_upload_iteration_count
  AFTER INSERT ON public.iterations
  FOR EACH ROW
  EXECUTE FUNCTION increment_iteration_count();

-- Function: Cleanup old iterations (keep last 10 per upload)
CREATE OR REPLACE FUNCTION cleanup_old_iterations() 
RETURNS void AS $$
BEGIN
  DELETE FROM public.iterations
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, 
        ROW_NUMBER() OVER (PARTITION BY upload_id ORDER BY iteration_number DESC) as rn
      FROM public.iterations
    ) sub
    WHERE rn <= 10
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Check daily upload quota
CREATE OR REPLACE FUNCTION check_upload_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_uploads_today INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT daily_upload_limit INTO v_limit
  FROM public.users WHERE id = p_user_id;
  
  SELECT COALESCE(uploads_count, 0) INTO v_uploads_today
  FROM public.quota_usage
  WHERE user_id = p_user_id AND quota_date = CURRENT_DATE;
  
  RETURN v_uploads_today < v_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Check daily iteration quota
CREATE OR REPLACE FUNCTION check_iteration_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_iterations_today INTEGER;
  v_limit INTEGER;
BEGIN
  SELECT daily_iteration_limit INTO v_limit
  FROM public.users WHERE id = p_user_id;
  
  SELECT COALESCE(iterations_count, 0) INTO v_iterations_today
  FROM public.quota_usage
  WHERE user_id = p_user_id AND quota_date = CURRENT_DATE;
  
  RETURN v_iterations_today < v_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment upload quota
CREATE OR REPLACE FUNCTION increment_upload_quota(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.quota_usage (user_id, quota_date, uploads_count, iterations_count)
  VALUES (p_user_id, CURRENT_DATE, 1, 0)
  ON CONFLICT (user_id, quota_date)
  DO UPDATE SET uploads_count = quota_usage.uploads_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment iteration quota
CREATE OR REPLACE FUNCTION increment_iteration_quota(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.quota_usage (user_id, quota_date, uploads_count, iterations_count)
  VALUES (p_user_id, CURRENT_DATE, 0, 1)
  ON CONFLICT (user_id, quota_date)
  DO UPDATE SET iterations_count = quota_usage.iterations_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user stats
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE (
  total_uploads BIGINT,
  total_iterations BIGINT,
  uploads_today INTEGER,
  iterations_today INTEGER,
  avg_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT u.id)::BIGINT as total_uploads,
    COUNT(i.id)::BIGINT as total_iterations,
    COALESCE(q.uploads_count, 0) as uploads_today,
    COALESCE(q.iterations_count, 0) as iterations_today,
    ROUND(AVG(i.iteration_rating), 2) as avg_rating
  FROM public.users usr
  LEFT JOIN public.uploads u ON usr.id = u.user_id
  LEFT JOIN public.iterations i ON u.id = i.upload_id
  LEFT JOIN public.quota_usage q ON usr.id = q.user_id AND q.quota_date = CURRENT_DATE
  WHERE usr.id = p_user_id
  GROUP BY usr.id, q.uploads_count, q.iterations_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wcag_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = auth_user_id);

-- RLS Policies: Uploads
CREATE POLICY "Users can view own uploads"
  ON public.uploads FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own uploads"
  ON public.uploads FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own uploads"
  ON public.uploads FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete own uploads"
  ON public.uploads FOR DELETE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- RLS Policies: Iterations
CREATE POLICY "Users can view own iterations"
  ON public.iterations FOR SELECT
  USING (upload_id IN (
    SELECT u.id FROM public.uploads u
    INNER JOIN public.users usr ON u.user_id = usr.id
    WHERE usr.auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own iterations"
  ON public.iterations FOR INSERT
  WITH CHECK (upload_id IN (
    SELECT u.id FROM public.uploads u
    INNER JOIN public.users usr ON u.user_id = usr.id
    WHERE usr.auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can update own iterations"
  ON public.iterations FOR UPDATE
  USING (upload_id IN (
    SELECT u.id FROM public.uploads u
    INNER JOIN public.users usr ON u.user_id = usr.id
    WHERE usr.auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own iterations"
  ON public.iterations FOR DELETE
  USING (upload_id IN (
    SELECT u.id FROM public.uploads u
    INNER JOIN public.users usr ON u.user_id = usr.id
    WHERE usr.auth_user_id = auth.uid()
  ));

-- RLS Policies: Quota usage
CREATE POLICY "Users can view own quota"
  ON public.quota_usage FOR SELECT
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert own quota"
  ON public.quota_usage FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update own quota"
  ON public.quota_usage FOR UPDATE
  USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

-- RLS Policies: WCAG issues
CREATE POLICY "Users can view own wcag issues"
  ON public.wcag_issues FOR SELECT
  USING (iteration_id IN (
    SELECT i.id FROM public.iterations i
    INNER JOIN public.uploads u ON i.upload_id = u.id
    INNER JOIN public.users usr ON u.user_id = usr.id
    WHERE usr.auth_user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own wcag issues"
  ON public.wcag_issues FOR INSERT
  WITH CHECK (iteration_id IN (
    SELECT i.id FROM public.iterations i
    INNER JOIN public.uploads u ON i.upload_id = u.id
    INNER JOIN public.users usr ON u.user_id = usr.id
    WHERE usr.auth_user_id = auth.uid()
  ));

-- ============================================================================
-- HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles with plan information and quota limits';
COMMENT ON TABLE public.uploads IS 'Original file uploads by users';
COMMENT ON TABLE public.iterations IS 'Refined code versions with WCAG fixes applied';
COMMENT ON TABLE public.quota_usage IS 'Daily quota tracking per user (uploads and iterations)';
COMMENT ON TABLE public.wcag_issues IS 'Detailed WCAG accessibility issues found during analysis';

COMMENT ON COLUMN public.users.plan IS 'Subscription plan: free (1 upload/day, 3 iterations/day), pro, enterprise';
COMMENT ON COLUMN public.uploads.status IS 'Processing status: uploaded, processing, processed, failed';
COMMENT ON COLUMN public.uploads.iteration_count IS 'Total number of refinement iterations for this upload';
COMMENT ON COLUMN public.iterations.refined_code IS 'WCAG-optimized HTML/CSS/JS code after analysis and fixes';
COMMENT ON COLUMN public.iterations.feedback IS 'User feedback provided for this iteration to guide next refinement';
COMMENT ON COLUMN public.iterations.iteration_rating IS 'Optional user rating (1-10) for iteration friendliness/quality';
COMMENT ON COLUMN public.iterations.analysis_results IS 'JSON object with detailed WCAG analysis results';
COMMENT ON COLUMN public.wcag_issues.wcag_criterion IS 'WCAG 2.1 success criterion (e.g., 1.1.1, 1.4.3, 2.1.1)';
COMMENT ON COLUMN public.wcag_issues.auto_fixed IS 'Whether this issue was automatically fixed by the analyzer';

-- ============================================================================
-- INITIAL DATA (OPTIONAL)
-- ============================================================================

-- Example: Create service role user for edge functions (optional)
-- INSERT INTO public.users (auth_user_id, email, full_name, plan)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000'::UUID,
--   'service@wcagmaster.com',
--   'Service Account',
--   'enterprise'
-- ) ON CONFLICT (auth_user_id) DO NOTHING;

-- ============================================================================
-- SCHEMA VERSION & METADATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schema_version (
  id INTEGER PRIMARY KEY DEFAULT 1,
  version TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  description TEXT,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.schema_version (version, description)
VALUES ('1.0.0', 'Initial WCAG Master schema with users, uploads, iterations, quotas, and WCAG issues')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.schema_version IS 'Tracks current database schema version';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
