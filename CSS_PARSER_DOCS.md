# WCAG Master - CSS Parser & Analyzer Documentation

## Overview
The WCAG Master analyzer now includes **CSS stylesheet parsing** to improve contrast detection coverage from ~10% (inline styles only) to ~80%+ (stylesheets + CSS variables).

## Features

### CSS Parser (`shared/wcag/css-parser.ts`)
- **Parses inline `<style>` blocks**: Extracts rules from embedded stylesheets
- **Fetches external stylesheets**: Attempts to download linked CSS files via `<link rel="stylesheet">`
- **CSS variable resolution**: Resolves `var(--custom-property)` references from `:root` declarations
- **Simple selector matching**: Uses `element.matches()` for rule application (pragmatic cascade)

### WCAG Analyzer Integration (`shared/wcag/analyzer.ts`)
- **Extended contrast checking**: Now examines text elements (`p`, `span`, `a`, `li`, `button`, etc.) using computed colors from stylesheets
- **Graceful fallback**: If stylesheet parsing fails (CORS, network error), falls back to inline-style-only checking
- **Non-breaking**: Existing functionality preserved; CSS parser runs asynchronously

## Usage

### Browser Environment
```typescript
import { analyzeHtml } from './lib/wcag-analyzer'

const parser = new DOMParser()
const result = analyzeHtml(htmlString, content => parser.parseFromString(content, 'text/html'))
```

### Deno/Supabase Edge Function
```typescript
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import { analyzeHtml } from '../../shared/wcag/analyzer.ts'

const parser = new DOMParser()
const result = analyzeHtml(htmlContent, html => parser.parseFromString(html, 'text/html'))
```

## Limitations & Fallbacks

### CORS-Blocked Stylesheets
External CSS files hosted on different origins may be blocked by CORS policies. The analyzer will:
1. Attempt to fetch the stylesheet
2. If blocked, silently skip that stylesheet
3. Continue with inline `<style>` blocks and other accessible stylesheets
4. Fall back to inline-style checking if all stylesheets fail

### CSS Coverage
- ✅ **Supported**: hex, rgb/rgba, hsl/hsla, named colors, CSS custom properties
- ✅ **Supported**: `:root` variable declarations, simple selectors (class, tag, ID)
- ⚠️ **Partial**: Complex selectors (`:hover`, `:nth-child`, media queries) may not match correctly
- ❌ **Not Supported**: `@import` statements, computed styles from JavaScript, pseudo-elements

### Performance Considerations
- Stylesheet fetching is asynchronous and won't block core analysis
- Large stylesheets (>1MB) are fetched but may increase processing time
- External fetches respect a ~5-second timeout (implicit in Deno fetch)

## Testing

Run unit tests to validate CSS parser and contrast calculation:
```bash
npm test
```

Test files:
- `shared/wcag/__tests__/contrast.test.ts` - Contrast calculation and CSS parsing tests

## API Reference

### `parseStylesheetsFromDocument(doc: Document): Promise<StylesheetBundle>`
Returns an object containing:
- `rules`: Array of `{ selector, declarations }` objects
- `vars`: Record of CSS custom properties from `:root`

### `computeColorsForElement(el: Element, bundle: StylesheetBundle): { color, background }`
Returns effective color and background-color for an element based on:
1. Inline `style` attribute (highest priority)
2. Matching CSS rules (last-match wins, simplified cascade)
3. Resolved CSS variables

## Migration Notes

### Upgrading from Previous Version
No breaking changes. The CSS parser is additive:
- Existing inline-style checks still run
- New stylesheet checks run in parallel
- Results are merged

### Database Migration
Apply `supabase/migrations/002_add_iteration_rating.sql` to add user rating support (optional):
```sql
psql -h <host> -U <user> -d <database> -f supabase/migrations/002_add_iteration_rating.sql
```

## Roadmap

### Future Enhancements
1. **Computed Style Resolution** (v2.0): Integrate headless browser for accurate final styles
2. **CSS Preprocessor Support** (v2.1): Parse SCSS/LESS before analysis
3. **Media Query Analysis** (v2.2): Detect responsive design accessibility issues
4. **@import Handling** (v2.3): Recursively fetch imported stylesheets

## Support

For issues or questions:
- File a GitHub issue at [Advant0-st4r/wcag-master](https://github.com/Advant0-st4r/wcag-master)
- Check existing documentation in `ARCHITECTURE.md`
