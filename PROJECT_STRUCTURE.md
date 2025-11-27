# SecureCode - Project Structure

## Overview
Professional code review platform built with React, TypeScript, Vite, and Tailwind CSS. This is a **frontend-only implementation** with placeholder backend integration points.

## Security & Privacy Design
- No business logic exposed in frontend code
- All sensitive operations marked with TODO comments for backend integration
- Analytics tracking for UX metrics only (no sensitive data logged)
- Input validation placeholders ready for implementation

## Architecture

### Pages (`src/pages/`)
- **Landing.tsx** - Marketing page with hero, value props, and trust indicators
- **Auth.tsx** - Sign-in/Sign-up UI (Lovable Cloud integration required)
- **Workspace.tsx** - File upload and management interface
- **Results.tsx** - Side-by-side code comparison viewer
- **Dashboard.tsx** - User metrics and activity overview
- **NotFound.tsx** - 404 error page

### Components (`src/components/`)
- **NavBar.tsx** - Responsive navigation with auth state
- **Hero.tsx** - Landing page hero section
- **ValueCard.tsx** - Reusable feature highlight cards
- **UploadCard.tsx** - Drag-and-drop file upload interface
- **FileList.tsx** - File management with status badges
- **CodeViewer.tsx** - Split-view code comparison component
- **EmptyState.tsx** - Reusable empty state pattern
- **ui/** - shadcn/ui component library

### Utilities (`src/lib/`)
- **analytics.ts** - PostHog analytics wrapper (placeholder implementation)

## Design System

### Colors (HSL-based semantic tokens)
- **Primary**: `221 83% 53%` - Brand blue for CTAs and accents
- **Success**: `142 76% 36%` - Green for positive actions
- **Warning**: `38 92% 50%` - Amber for caution states
- **Destructive**: `0 84% 60%` - Red for errors/deletions

All colors use CSS custom properties defined in `src/index.css` for light/dark mode support.

### Typography
- Base: 12px-16px scale
- Headings: Semibold weights
- Body: Regular weight with `text-muted-foreground` for secondary text

### Spacing
- 8px baseline grid
- Container: max-width with responsive padding
- Components: Consistent gap utilities (gap-2, gap-4, gap-6, gap-8)

## Backend Integration TODOs

### 1. Lovable Cloud Setup
Enable Lovable Cloud to activate:
- PostgreSQL database
- Authentication system
- File storage
- Serverless edge functions

### 2. Authentication (`src/pages/Auth.tsx`)
```typescript
// TODO: Replace with Lovable Cloud auth
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })
```

### 3. File Storage (`src/pages/Workspace.tsx`)
```typescript
// TODO: Upload to Lovable Cloud storage
await supabase.storage.from('uploads').upload(path, file)

// TODO: List user files
const { data } = await supabase.storage.from('uploads').list()

// TODO: Delete files
await supabase.storage.from('uploads').remove([path])
```

### 4. Results Retrieval (`src/pages/Results.tsx`)
```typescript
// TODO: Fetch processed results from database
const { data } = await supabase
  .from('results')
  .select('*')
  .eq('file_id', fileId)
```

### 5. Analytics (`src/lib/analytics.ts`)
```typescript
// TODO: Add PostHog API key and initialize
posthog.init('YOUR_API_KEY', { api_host: 'https://app.posthog.com' })
```

## SEO Optimizations
- Semantic HTML5 structure (`<main>`, `<section>`, `<nav>`, `<footer>`)
- Meta tags: title, description, keywords, canonical
- Open Graph and Twitter Card tags
- Accessible navigation with ARIA labels
- Keyboard navigation support

## Accessibility Features
- Semantic heading hierarchy (h1 → h2 → h3)
- Focus indicators on interactive elements
- Descriptive button and link text
- Color contrast meets WCAG AA standards
- Responsive touch targets (min 44x44px)

## Routes
| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | Landing | No |
| `/auth` | Auth | No |
| `/workspace` | Workspace | Yes* |
| `/results` | Results | Yes* |
| `/dashboard` | Dashboard | Yes* |

*Auth checks not enforced yet - requires Lovable Cloud integration

## Development Commands
```bash
npm install        # Install dependencies
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run preview    # Preview production build
```

## Next Steps
1. Enable Lovable Cloud for backend capabilities
2. Implement authentication flows in Auth.tsx
3. Connect file upload to storage buckets
4. Create edge functions for file processing
5. Add PostHog analytics tracking
6. Implement RLS policies for data security

## Privacy & Compliance
- GDPR-ready design (no PII in frontend)
- Placeholder compliance badges (SOC 2, ISO 27001)
- Terms of Service and Privacy Policy links ready
- Zero client-side data retention

---

**Built with Lovable** - Vite, React, TypeScript, Tailwind CSS
