// supabase/functions/refine-code/index.ts
import { serve } from '@supabase/functions'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import { WCAGAnalyzer as SharedAnalyzer } from '../../shared/wcag/analyzer.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Missing Supabase env in function.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

// WCAG Refinement Analyzer leveraging shared analyzer core
class WCAGRefiner {
  refine(html: string, userFeedback: string) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    if (!doc) throw new Error('Failed to parse HTML')

    const fixesFromFeedback = this.applyFeedbackImprovements(doc, userFeedback)

    const analyzer = new SharedAnalyzer()
    const result = analyzer.analyzeDocument(doc)
    const summary = {
      ...result.summary,
      fixesApplied: result.summary.fixesApplied + fixesFromFeedback
    }

    return {
      violations: result.violations,
      refinedCode: result.optimizedCode,
      fixesApplied: summary.fixesApplied,
      summary
    }
  }

  private applyFeedbackImprovements(doc: Document, feedback: string): number {
    const lowerFeedback = feedback.toLowerCase()
    let fixes = 0

    if (lowerFeedback.includes('mobile')) {
      const meta = doc.querySelector('meta[name="viewport"]')
      if (!meta) {
        const viewport = doc.createElement('meta')
        viewport.setAttribute('name', 'viewport')
        viewport.setAttribute('content', 'width=device-width, initial-scale=1')
        doc.head?.appendChild(viewport)
        fixes++
      }
    }

    if (lowerFeedback.includes('focus') || lowerFeedback.includes('keyboard')) {
      doc.querySelectorAll('a, button, input, select, textarea').forEach(el => {
        if (!el.getAttribute('tabindex') && el.tagName !== 'INPUT') {
          el.setAttribute('tabindex', '0')
          fixes++
        }
      })
    }

    if (lowerFeedback.includes('contrast') || lowerFeedback.includes('color')) {
      const comment = doc.createComment(' Consider using high contrast colors: text #000000 on #FFFFFF background ')
      doc.body?.insertBefore(comment, doc.body.firstChild)
    }

    if (lowerFeedback.includes('semantic') || lowerFeedback.includes('structure')) {
      doc.querySelectorAll('div[class*="header"]').forEach(div => {
        const header = doc.createElement('header')
        header.innerHTML = div.innerHTML
        div.replaceWith(header)
        fixes++
      })

      doc.querySelectorAll('div[class*="footer"]').forEach(div => {
        const footer = doc.createElement('footer')
        footer.innerHTML = div.innerHTML
        div.replaceWith(footer)
        fixes++
      })
    }

    if (!doc.querySelector('a.skip-link')) {
      const skipLink = doc.createElement('a')
      skipLink.setAttribute('href', '#main-content')
      skipLink.setAttribute('class', 'skip-link sr-only focus:not-sr-only')
      skipLink.textContent = 'Skip to main content'
      doc.body?.insertBefore(skipLink, doc.body.firstChild)
      fixes++
    }

    return fixes
  }
}

serve(async (req) => {
  try {
    const { uploadId, feedback, rating } = await req.json()

    if (!uploadId) {
      return new Response(JSON.stringify({ error: 'Missing uploadId' }), { status: 400 })
    }

    // 1) Fetch upload record
    const { data: upload, error: uploadError } = await supabaseAdmin
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single()

    if (uploadError || !upload) {
      return new Response(JSON.stringify({ error: uploadError?.message || 'Upload not found' }), { status: 404 })
    }

    // 2) Get latest refined code from iterations
    const { data: lastIteration } = await supabaseAdmin
      .from('iterations')
      .select('refined_code, iteration_number')
      .eq('upload_id', uploadId)
      .order('iteration_number', { ascending: false })
      .limit(1)
      .single()

    const currentCode = lastIteration?.refined_code || upload.file_content || ''
    const nextIterationNumber = (lastIteration?.iteration_number || 0) + 1

    // Enforce per-upload daily iteration limit: max 3 refinements per upload per day
    const startOfDay = new Date()
    startOfDay.setHours(0,0,0,0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data: todaysIterations, error: tiErr } = await supabaseAdmin
      .from('iterations')
      .select('id')
      .eq('upload_id', uploadId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    if (tiErr) {
      return new Response(JSON.stringify({ error: tiErr.message }), { status: 500 })
    }

    if ((todaysIterations || []).length >= 3) {
      return new Response(JSON.stringify({ error: 'Daily iteration limit reached for this project (3 per day).' }), { status: 429 })
    }

    // Prevent very large payloads from being processed
    const contentBytes = new TextEncoder().encode(currentCode || '').length
    const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
    if (contentBytes > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'File too large to analyze (limit 10MB).' }), { status: 413 })
    }

    // 3) Run WCAG refinement with user feedback
    const refiner = new WCAGRefiner()
    const refinementResult = refiner.refine(currentCode, feedback || '')

    // 4) Persist new iteration (include optional user rating 1-10)
    const safeRating = typeof rating === 'number' && Number.isFinite(rating) && rating >= 1 && rating <= 10 ? rating : null
    const { error: iterErr } = await supabaseAdmin
      .from('iterations')
      .insert([{
        upload_id: uploadId,
        iteration_number: nextIterationNumber,
        feedback: feedback || '',
        refined_code: refinementResult.refinedCode,
        iteration_rating: safeRating
      }])

    if (iterErr) {
      return new Response(JSON.stringify({ error: iterErr.message }), { status: 500 })
    }

    // 5) Update upload record
    await supabaseAdmin
      .from('uploads')
      .update({ 
        iteration_count: nextIterationNumber,
        status: 'processed'
      })
      .eq('id', uploadId)

    return new Response(JSON.stringify({ 
      refinedCode: refinementResult.refinedCode,
      violations: refinementResult.violations,
      fixesApplied: refinementResult.fixesApplied,
      summary: refinementResult.summary
    }), { status: 200 })
  } catch (err) {
    console.error('Refine-code function error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})


