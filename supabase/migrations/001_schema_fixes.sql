-- Database Schema Updates for WCAG Master
-- Ensures data consistency across frontend and backend

-- Drop old column if exists and add standardized refined_code column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'iterations' AND column_name = 'code_snapshot'
  ) THEN
    ALTER TABLE iterations DROP COLUMN code_snapshot;
  END IF;
END $$;

-- Ensure iterations table has the correct structure
ALTER TABLE iterations 
  ADD COLUMN IF NOT EXISTS refined_code TEXT,
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS iteration_number INTEGER DEFAULT 1;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_iterations_upload_id 
  ON iterations(upload_id, iteration_number DESC);

CREATE INDEX IF NOT EXISTS idx_uploads_user_status 
  ON uploads(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_uploads_created 
  ON uploads(created_at DESC);

-- Add constraints
ALTER TABLE iterations 
  ADD CONSTRAINT IF NOT EXISTS iterations_upload_fk 
  FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE;

-- Update uploads table structure
ALTER TABLE uploads 
  ADD COLUMN IF NOT EXISTS iteration_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded';

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uploads_status_check'
  ) THEN
    ALTER TABLE uploads 
      ADD CONSTRAINT uploads_status_check 
      CHECK (status IN ('uploaded', 'processing', 'processed', 'failed'));
  END IF;
END $$;

-- Create function to clean up old iterations (keep last 10 per upload)
CREATE OR REPLACE FUNCTION cleanup_old_iterations() 
RETURNS void AS $$
BEGIN
  DELETE FROM iterations
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, 
        ROW_NUMBER() OVER (PARTITION BY upload_id ORDER BY iteration_number DESC) as rn
      FROM iterations
    ) sub
    WHERE rn <= 10
  );
END;
$$ LANGUAGE plpgsql;

-- Add comment to refined_code column
COMMENT ON COLUMN iterations.refined_code IS 'WCAG-optimized HTML/CSS/JS code after analysis and fixes';
COMMENT ON COLUMN iterations.feedback IS 'User feedback provided for this iteration';
COMMENT ON COLUMN uploads.status IS 'Current processing status: uploaded, processing, processed, failed';
