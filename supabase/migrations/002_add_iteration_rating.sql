-- Add rating column to iterations for user friendliness scoring
ALTER TABLE iterations
  ADD COLUMN IF NOT EXISTS iteration_rating INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'iterations_rating_check'
  ) THEN
    ALTER TABLE iterations
      ADD CONSTRAINT iterations_rating_check CHECK (iteration_rating IS NULL OR (iteration_rating >= 1 AND iteration_rating <= 10));
  END IF;
END $$;

COMMENT ON COLUMN iterations.iteration_rating IS 'Optional user rating (1-10) for this iteration''s friendliness/quality';
