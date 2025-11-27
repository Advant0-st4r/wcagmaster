# Environment Variables for WCAG Master

## Required for Frontend (.env, .env.example)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_CLERK_PUBLISHABLE_KEY
- VITE_OPENAI_API_KEY
- VITE_SENTRY_DSN

## Required for Backend (Supabase Edge Functions)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- SENTRY_DSN

## Notes
- Sentry DSN is required for error monitoring in both frontend and backend.
- All variables must be set in deployment for full functionality.
