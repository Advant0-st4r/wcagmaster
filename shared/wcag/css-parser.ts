// shared/wcag/css-parser.ts
// Lightweight CSS rule extractor and simple selector matcher used by the analyzer.
// Purpose: incrementally improve contrast detection by parsing <style> blocks and
// fetching <link rel="stylesheet"> where possible. Not a full CSS engine — pragmatic fallback.

export interface CssRule {
  selector: string
  declarations: Record<string, string>
}

export interface StylesheetBundle {
  rules: CssRule[]
  vars: Record<string, string>
}

async function fetchStylesheet(href: string): Promise<string | null> {
  try {
    const res = await fetch(href)
    if (!res.ok) return null
    return await res.text()
  } catch (_) {
    return null
  }
}

function parseCssDeclarations(block: string): Record<string, string> {
  const decls: Record<string, string> = {}
  // naive split by ; but robust enough for common declarations
  block.split(';').forEach(part => {
    const idx = part.indexOf(':')
    if (idx > -1) {
      const prop = part.slice(0, idx).trim().toLowerCase()
      const val = part.slice(idx + 1).trim()
      if (prop) decls[prop] = val
    }
  })
  return decls
}

function extractRulesFromCss(cssText: string): CssRule[] {
  const rules: CssRule[] = []
  // Very small parser: match selectors followed by { ... }
  const re = /([^{}]+)\{([^}]+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cssText)) !== null) {
    const selector = m[1].trim()
    const body = m[2].trim()
    if (!selector) continue
    const declarations = parseCssDeclarations(body)
    rules.push({ selector, declarations })
  }
  return rules
}

function collectVars(rules: CssRule[]): Record<string, string> {
  const vars: Record<string, string> = {}
  rules.forEach(r => {
    if (r.selector === ':root' || r.selector === 'html') {
      Object.keys(r.declarations).forEach(k => {
        if (k.startsWith('--')) vars[k] = r.declarations[k]
      })
    }
  })
  return vars
}

export async function parseStylesheetsFromDocument(doc: Document): Promise<StylesheetBundle> {
  const rules: CssRule[] = []
  // inline <style> blocks
  try {
    const styleTags = Array.from(doc.querySelectorAll('style'))
    styleTags.forEach(s => {
      const text = s.textContent || ''
      rules.push(...extractRulesFromCss(text))
    })

    // linked stylesheets
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
    for (const link of links) {
      const href = (link.getAttribute('href') || '').trim()
      if (!href) continue
      const css = await fetchStylesheet(href)
      if (!css) continue
      rules.push(...extractRulesFromCss(css))
    }
  } catch (_) {
    // defensive — don't fail analysis if DOM is limited
  }

  const vars = collectVars(rules)
  return { rules, vars }
}

// Compute a simple effective value for a property for an element by checking inline style first,
// then matching rules in source order (last wins). This is intentionally pragmatic and not a full cascade.
export function computeEffectiveProperty(el: Element, prop: string, bundle: StylesheetBundle): string | null {
  // inline style
  try {
    const inline = el.getAttribute('style')
    if (inline) {
      const decls = parseCssDeclarations(inline)
      const key = prop.toLowerCase()
      if (decls[key]) return resolveVars(decls[key], bundle.vars)
    }

    // match rules in order, last matching rule wins
    let matched: string | null = null
    for (const rule of bundle.rules) {
      try {
        // use element.matches for selector matching when available
        if ((el as any).matches && (el as any).matches(rule.selector)) {
          const val = rule.declarations[prop.toLowerCase()]
          if (val) matched = resolveVars(val, bundle.vars)
        }
      } catch (_) {
        // selector may be complex or not supported by deno-dom -> ignore
      }
    }
    return matched
  } catch (_) {
    return null
  }
}

function resolveVars(value: string, vars: Record<string, string>): string {
  // resolve simple var(--name) occurrences
  return value.replace(/var\((--[a-zA-Z0-9-_]+)\)/g, (_, name) => vars[name] || '')
}

export function computeColorsForElement(el: Element, bundle: StylesheetBundle): { color?: string | null; background?: string | null } {
  const color = computeEffectiveProperty(el, 'color', bundle) || null
  const bg = computeEffectiveProperty(el, 'background-color', bundle) || computeEffectiveProperty(el, 'background', bundle) || null
  return { color, background: bg }
}

export default {
  parseStylesheetsFromDocument,
  computeColorsForElement
}
