import { contrastCalculator } from './contrast'
import cssParser from './css-parser'

export interface WCAGViolation {
  rule: string
  severity: 'error' | 'warning'
  element: string
  location: string
  fix: string
  wcagCriterion: string
}

export interface AnalysisSummary {
  errors: number
  warnings: number
  fixesApplied: number
}

export interface AnalysisResult {
  violations: WCAGViolation[]
  optimizedCode: string
  summary: AnalysisSummary
}

export type HtmlParser = (html: string) => Document | null

/**
 * Shared WCAG analyzer usable in both browser (DOMParser) and Deno (deno_dom) contexts
 */
export class WCAGAnalyzer {
  private violations: WCAGViolation[] = []
  private fixesApplied = 0

  analyzeDocument(doc: Document): AnalysisResult {
    this.violations = []
    this.fixesApplied = 0

    this.checkDocumentStructure(doc)
    this.checkImages(doc)
    this.checkHeadings(doc)
    this.checkLandmarks(doc)
    this.checkForms(doc)
    this.checkButtons(doc)
    this.checkLinks(doc)
    this.checkLanguage(doc)
    this.checkTables(doc)
    this.checkIframes(doc)
    this.checkContrast(doc)

    const optimizedCode = this.applyFixes(doc)

    return {
      violations: this.violations,
      optimizedCode,
      summary: {
        errors: this.violations.filter(v => v.severity === 'error').length,
        warnings: this.violations.filter(v => v.severity === 'warning').length,
        fixesApplied: this.fixesApplied
      }
    }
  }

  analyzeHtml(html: string, parse: HtmlParser): AnalysisResult {
    const doc = parse(html)
    if (!doc) throw new Error('Failed to parse HTML')
    return this.analyzeDocument(doc)
  }

  private checkDocumentStructure(doc: Document) {
    try {
      const doctype = (doc as any).doctype
      if (!doctype) {
        this.violations.push({
          rule: 'HTML5 Document Type',
          severity: 'warning',
          element: '<html>',
          location: 'Document root',
          fix: 'Add <!DOCTYPE html> at the beginning',
          wcagCriterion: '4.1.1 Parsing'
        })
      }
    } catch (_) {
      // ignore doctype checks for minimal DOM implementations
    }

    const html = doc.documentElement
    if (html && !html.getAttribute('lang')) {
      const snippet = typeof html.outerHTML === 'string' ? html.outerHTML.substring(0, 50) : '<html>'
      this.violations.push({
        rule: 'Page Language',
        severity: 'error',
        element: snippet,
        location: '<html> tag',
        fix: '<html lang="en">',
        wcagCriterion: '3.1.1 Language of Page'
      })
    }

    const title = doc.querySelector('title')?.textContent || ''
    if (!title.trim()) {
      this.violations.push({
        rule: 'Page Title',
        severity: 'error',
        element: '<head>',
        location: 'Document head',
        fix: '<title>Descriptive Page Title</title>',
        wcagCriterion: '2.4.2 Page Titled'
      })
    }
  }

  private checkImages(doc: Document) {
    const images = doc.querySelectorAll('img')
    images.forEach((img, index) => {
      const alt = img.getAttribute('alt')
      const src = img.getAttribute('src') || '[no src]'
      const element = typeof img.outerHTML === 'string' ? img.outerHTML : '<img>'

      if (alt === null) {
        this.violations.push({
          rule: 'Image Alt Text',
          severity: 'error',
          element,
          location: `Image ${index + 1}: ${src}`,
          fix: `Add alt="${this.generateAltText(src)}" attribute`,
          wcagCriterion: '1.1.1 Non-text Content'
        })
      } else if (alt.trim() === '' && !this.isDecorativeImage(img)) {
        this.violations.push({
          rule: 'Empty Alt Text',
          severity: 'warning',
          element,
          location: `Image ${index + 1}: ${src}`,
          fix: 'Add descriptive alt text or use alt="" for decorative images',
          wcagCriterion: '1.1.1 Non-text Content'
        })
      }
    })
  }

  private checkHeadings(doc: Document) {
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    if (headings.length === 0) {
      this.violations.push({
        rule: 'No Headings Found',
        severity: 'warning',
        element: '<body>',
        location: 'Document body',
        fix: 'Add heading structure (h1-h6) for content hierarchy',
        wcagCriterion: '1.3.1 Info and Relationships'
      })
      return
    }

    const h1Count = headings.filter(h => h.tagName === 'H1').length
    if (h1Count === 0) {
      const element = headings[0]?.outerHTML || '<h2>'
      this.violations.push({
        rule: 'Missing Main Heading',
        severity: 'error',
        element,
        location: 'Document structure',
        fix: 'Add an <h1> element as the main page heading',
        wcagCriterion: '1.3.1 Info and Relationships'
      })
    } else if (h1Count > 1) {
      this.violations.push({
        rule: 'Multiple H1 Elements',
        severity: 'warning',
        element: '<h1>',
        location: 'Document structure',
        fix: 'Use only one <h1> per page',
        wcagCriterion: '1.3.1 Info and Relationships'
      })
    }

    let prevLevel = 0
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName[1])
      if (Number.isFinite(level)) {
        if (prevLevel > 0 && level - prevLevel > 1) {
          const element = typeof heading.outerHTML === 'string' ? heading.outerHTML : `<h${level}>`
          this.violations.push({
            rule: 'Heading Hierarchy Skip',
            severity: 'warning',
            element,
            location: `Heading ${index + 1}`,
            fix: `Use <h${prevLevel + 1}> instead of <h${level}> to maintain hierarchy`,
            wcagCriterion: '1.3.1 Info and Relationships'
          })
        }
        prevLevel = level
      }
    })
  }

  private checkLandmarks(doc: Document) {
    const hasMain = doc.querySelector('main, [role="main"]')
    if (!hasMain) {
      this.violations.push({
        rule: 'Missing Main Landmark',
        severity: 'error',
        element: '<body>',
        location: 'Document structure',
        fix: 'Wrap main content in <main> element',
        wcagCriterion: '1.3.1 Info and Relationships'
      })
    }

    const hasHeader = doc.querySelector('header, [role="banner"]')
    if (!hasHeader && doc.body && doc.body.children.length > 3) {
      this.violations.push({
        rule: 'Missing Header Landmark',
        severity: 'warning',
        element: '<body>',
        location: 'Document structure',
        fix: 'Add <header> element for site header',
        wcagCriterion: '1.3.1 Info and Relationships'
      })
    }
  }

  private checkForms(doc: Document) {
    const inputs = doc.querySelectorAll('input:not([type="hidden"]), textarea, select')
    inputs.forEach((input, index) => {
      const id = input.getAttribute('id')
      const ariaLabel = input.getAttribute('aria-label')
      const ariaLabelledBy = input.getAttribute('aria-labelledby')
      const type = input.getAttribute('type') || 'text'
      const element = typeof input.outerHTML === 'string' ? input.outerHTML : `<input type="${type}">`

      const hasLabel = id ? doc.querySelector(`label[for="${id}"]`) : null
      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        this.violations.push({
          rule: 'Form Field Label',
          severity: 'error',
          element,
          location: `Form input ${index + 1} (${type})`,
          fix: `Add <label for="${id || 'input-' + index}">Label Text</label>`,
          wcagCriterion: '3.3.2 Labels or Instructions'
        })
      }

      if (input.hasAttribute('required') && !input.hasAttribute('aria-required')) {
        this.violations.push({
          rule: 'Required Field Indication',
          severity: 'warning',
          element,
          location: `Form input ${index + 1}`,
          fix: 'Add aria-required="true" or visual indicator',
          wcagCriterion: '3.3.2 Labels or Instructions'
        })
      }
    })
  }

  private checkButtons(doc: Document) {
    const buttons = doc.querySelectorAll('button, [role="button"]')
    buttons.forEach((btn, index) => {
      const text = btn.textContent?.trim()
      const ariaLabel = btn.getAttribute('aria-label')
      const ariaLabelledBy = btn.getAttribute('aria-labelledby')
      const element = typeof btn.outerHTML === 'string' ? btn.outerHTML : '<button>'

      if (!text && !ariaLabel && !ariaLabelledBy) {
        this.violations.push({
          rule: 'Button Accessible Name',
          severity: 'error',
          element,
          location: `Button ${index + 1}`,
          fix: 'Add text content or aria-label attribute',
          wcagCriterion: '4.1.2 Name, Role, Value'
        })
      }

      if (text && ['click here', 'click', 'here', 'button'].includes(text.toLowerCase())) {
        this.violations.push({
          rule: 'Non-Descriptive Button Text',
          severity: 'warning',
          element,
          location: `Button ${index + 1}`,
          fix: 'Use descriptive button text (e.g., "Submit Form", "Learn More")',
          wcagCriterion: '2.4.4 Link Purpose'
        })
      }
    })
  }

  private checkLinks(doc: Document) {
    const links = doc.querySelectorAll('a[href]')
    links.forEach((link, index) => {
      const text = link.textContent?.trim()
      const ariaLabel = link.getAttribute('aria-label')
      const href = link.getAttribute('href')
      const element = typeof link.outerHTML === 'string' ? link.outerHTML : '<a>'

      if (!text && !ariaLabel) {
        this.violations.push({
          rule: 'Link Accessible Name',
          severity: 'error',
          element,
          location: `Link ${index + 1}: ${href}`,
          fix: 'Add descriptive text or aria-label',
          wcagCriterion: '2.4.4 Link Purpose'
        })
      }

      if (text && ['click here', 'here', 'read more', 'more'].includes(text.toLowerCase())) {
        this.violations.push({
          rule: 'Generic Link Text',
          severity: 'warning',
          element,
          location: `Link ${index + 1}`,
          fix: 'Use descriptive link text that makes sense out of context',
          wcagCriterion: '2.4.4 Link Purpose'
        })
      }

      if (link.getAttribute('target') === '_blank' && !ariaLabel?.includes('new window')) {
        this.violations.push({
          rule: 'New Window Warning',
          severity: 'warning',
          element,
          location: `Link ${index + 1}`,
          fix: 'Add "(opens in new window)" to link text or aria-label',
          wcagCriterion: '3.2.5 Change on Request'
        })
      }
    })
  }

  private checkLanguage(doc: Document) {
    const elementsWithLang = doc.querySelectorAll('[lang]')
    elementsWithLang.forEach((el, index) => {
      const lang = el.getAttribute('lang') || ''
      if (lang && !/^[a-z]{2}(-[A-Z]{2})?$/.test(lang)) {
        const element = typeof el.outerHTML === 'string' ? el.outerHTML.substring(0, 50) : `<${el.tagName.toLowerCase()}>`
        this.violations.push({
          rule: 'Invalid Language Code',
          severity: 'warning',
          element,
          location: `Element ${index + 1}`,
          fix: 'Use valid BCP 47 language codes (e.g., "en", "es", "fr-CA")',
          wcagCriterion: '3.1.2 Language of Parts'
        })
      }
    })
  }

  private checkTables(doc: Document) {
    const tables = doc.querySelectorAll('table')
    tables.forEach((table, index) => {
      const hasCaption = table.querySelector('caption')
      const hasTh = table.querySelector('th')
      const element = typeof table.outerHTML === 'string' ? table.outerHTML.substring(0, 100) : '<table>'

      if (!hasCaption && !table.getAttribute('aria-label')) {
        this.violations.push({
          rule: 'Table Caption',
          severity: 'warning',
          element,
          location: `Table ${index + 1}`,
          fix: 'Add <caption> or aria-label to describe table purpose',
          wcagCriterion: '1.3.1 Info and Relationships'
        })
      }

      if (!hasTh) {
        this.violations.push({
          rule: 'Table Headers',
          severity: 'error',
          element,
          location: `Table ${index + 1}`,
          fix: 'Use <th> elements for table headers with scope attribute',
          wcagCriterion: '1.3.1 Info and Relationships'
        })
      }
    })
  }

  private checkIframes(doc: Document) {
    const iframes = doc.querySelectorAll('iframe')
    iframes.forEach((iframe, index) => {
      const title = iframe.getAttribute('title')
      const src = iframe.getAttribute('src')
      const element = typeof iframe.outerHTML === 'string' ? iframe.outerHTML : '<iframe>'

      if (!title) {
        this.violations.push({
          rule: 'Iframe Title',
          severity: 'error',
          element,
          location: `Iframe ${index + 1}: ${src}`,
          fix: 'Add title attribute describing iframe content',
          wcagCriterion: '4.1.2 Name, Role, Value'
        })
      }
    })
  }

  private checkContrast(doc: Document) {
    // Parse stylesheets to build rule set and variables (pragmatic)
    // This fetch may fail for CORS-protected stylesheets; we gracefully continue.
    cssParser.parseStylesheetsFromDocument(doc).then(bundle => {
      // Check text-containing elements (practical subset)
      const textEls = Array.from(doc.querySelectorAll('p, span, a, li, td, th, button, label, h1, h2, h3, h4, h5, h6'))
      textEls.forEach((el, idx) => {
        try {
          const { color, background } = cssParser.computeColorsForElement(el, bundle)
          // if no explicit colors found, skip — leave implicit styling to computed-style pass
          if (!color || !background) return

          const fg = color.trim()
          const bg = background.trim()
          const ratio = contrastCalculator.getContrastRatio(fg, bg)
          if (ratio > 0 && !contrastCalculator.meetsWCAG_AA(fg, bg)) {
            const element = typeof el.outerHTML === 'string' ? el.outerHTML.substring(0, 200) : `<${el.tagName.toLowerCase()}>`
            this.violations.push({
              rule: 'Contrast Ratio',
              severity: 'error',
              element,
              location: `Element ${idx + 1}`,
              fix: `Consider using ${contrastCalculator.suggestAccessibleColor(fg, bg)} for text color or change background`,
              wcagCriterion: '1.4.3 Contrast (Minimum)'
            })
          }
        } catch (_) {
          // ignore and continue
        }
      })
    }).catch(() => {
      // If stylesheet parsing fails completely, fallback to inline styles check
      const styled = Array.from(doc.querySelectorAll('[style]'))
      styled.forEach((el, idx) => {
        const style = el.getAttribute('style') || ''
        const colorMatch = style.match(/color\s*:\s*([^;]+)/i)
        const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i)
        if (colorMatch && bgMatch) {
          const fg = colorMatch[1].trim()
          const bg = bgMatch[1].trim()
          try {
            const ratio = contrastCalculator.getContrastRatio(fg, bg)
            if (ratio > 0 && !contrastCalculator.meetsWCAG_AA(fg, bg)) {
              const element = typeof el.outerHTML === 'string' ? el.outerHTML.substring(0, 200) : `<${el.tagName.toLowerCase()}>`
              this.violations.push({
                rule: 'Contrast Ratio',
                severity: 'error',
                element,
                location: `Styled element ${idx + 1}`,
                fix: `Consider using ${contrastCalculator.suggestAccessibleColor(fg, bg)} for text color or change background`,
                wcagCriterion: '1.4.3 Contrast (Minimum)'
              })
            }
          } catch (_) {
            // ignore parsing errors
          }
        }
      })
    })
  }

  private applyFixes(doc: Document): string {
    const htmlElement = doc.documentElement
    if (htmlElement && !htmlElement.getAttribute('lang')) {
      htmlElement.setAttribute('lang', 'en')
      this.fixesApplied++
    }

    doc.querySelectorAll('img:not([alt])').forEach(img => {
      const src = img.getAttribute('src') || ''
      img.setAttribute('alt', this.generateAltText(src))
      this.fixesApplied++
    })

    if (!doc.querySelector('main, [role="main"]') && doc.body) {
      const main = doc.createElement('main')
      while (doc.body.firstChild) {
        main.appendChild(doc.body.firstChild)
      }
      doc.body.appendChild(main)
      this.fixesApplied++
    }

    doc.querySelectorAll('input:not([type="hidden"]):not([id]), textarea:not([id]), select:not([id])')
      .forEach((input, index) => {
        const id = `field-${Date.now()}-${index}`
        input.setAttribute('id', id)
        this.fixesApplied++
      })

    doc.querySelectorAll('iframe:not([title])').forEach((iframe, index) => {
      iframe.setAttribute('title', `Embedded content ${index + 1}`)
      this.fixesApplied++
    })

    doc.querySelectorAll('button:not([aria-label])').forEach(btn => {
      if (!btn.textContent?.trim()) {
        btn.setAttribute('aria-label', 'Button')
        this.fixesApplied++
      }
    })

    const documentElement = doc.documentElement as any
    return typeof documentElement.outerHTML === 'string'
      ? documentElement.outerHTML
      : '<!DOCTYPE html>' + doc.documentElement?.innerHTML
  }

  private generateAltText(src: string): string {
    const filename = src.split('/').pop()?.split('.')[0] || 'image'
    return filename.replace(/[-_]/g, ' ')
  }

  private isDecorativeImage(img: Element): boolean {
    const role = img.getAttribute('role')
    const parent = img.parentElement
    return role === 'presentation' || role === 'none' || parent?.tagName === 'A'
  }
}

export function analyzeHtml(html: string, parser: HtmlParser): AnalysisResult {
  return new WCAGAnalyzer().analyzeHtml(html, parser)
}
