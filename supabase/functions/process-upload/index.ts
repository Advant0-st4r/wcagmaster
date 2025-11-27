// Sentry integration for error logging
import * as Sentry from "npm:@sentry/node";
Sentry.init({ dsn: Deno.env.get("SENTRY_DSN") });
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import { analyzeHtml } from '../../shared/wcag/analyzer.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// WCAG Analyzer for Deno environment
class WCAGAnalyzer {
    const { uploadId } = await req.json()
    if (!uploadId) return new Response(JSON.stringify({ error: 'Missing uploadId' }), { status: 400 })

    // Fetch the uploaded file
    const { data: upload, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single()
    
    if (error || !upload) {
      return new Response(JSON.stringify({ error: error?.message || 'Upload not found' }), { status: 404 })
    }

    // Enforce per-user daily project limit: one project per account per day
    const userId = upload.user_id
    const startOfDay = new Date()
    startOfDay.setHours(0,0,0,0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const { data: todaysUploads, error: tuErr } = await supabase
      .from('uploads')
      .select('id, file_path')
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString())
      .lt('created_at', endOfDay.toISOString())

    if (tuErr) {
      Sentry.captureException(tuErr);
      console.error('Quota check error:', tuErr.message)
      return new Response(JSON.stringify({ error: tuErr.message, code: 'quota_check_error' }), { status: 500 })
    }

    // If the user already has an upload processed/created today and this upload isn't that one, block.
    if ((todaysUploads || []).length >= 1) {
      // Allow the same upload to be processed if it's today's upload
      const isTodaysUpload = todaysUploads.find((u: any) => u.id === uploadId)
      if (!isTodaysUpload) {
        console.warn('Quota block: user', userId, 'tried to upload more than 1 project today.');
        return new Response(JSON.stringify({ error: 'Daily project limit reached for this account (1 project per day).', code: 'quota_exceeded' }), { status: 429 })
      }
    }

    // Download file from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(upload.file_path)

    if (downloadError || !fileBlob) {
      Sentry.captureException(downloadError);
      console.error('File download error:', downloadError?.message)
      return new Response(JSON.stringify({ error: 'Failed to download file: ' + (downloadError?.message || 'no blob'), code: 'file_download_error' }), { status: 500 })
    }

    // File type validation (only allow .html or .htm)
    const allowedExtensions = ['.html', '.htm']
    const filePath = upload.file_path || ''
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
    if (!allowedExtensions.includes(ext)) {
      console.warn('File type block: user', userId, 'tried to upload', filePath)
      return new Response(JSON.stringify({ error: 'Only HTML files are allowed for analysis.', code: 'invalid_file_type' }), { status: 415 })
    }

    // Check file size (avoid processing extremely large uploads)
    try {
      const buf = await fileBlob.arrayBuffer()
      const size = buf.byteLength
      const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
      if (size > MAX_BYTES) {
        console.warn('File size block: user', userId, 'file', filePath, 'size', size)
        return new Response(JSON.stringify({ error: 'File too large to analyze (limit 10MB).', code: 'file_too_large' }), { status: 413 })
      }
      const decoder = new TextDecoder('utf-8')
      const fileContent = decoder.decode(buf)

      // Run WCAG analysis
      const parser = new DOMParser()
      const analysisResult = analyzeHtml(fileContent, html => parser.parseFromString(html, 'text/html'))

      // Insert iteration record with optimized code
      const { error: iterationError } = await supabase
        .from('iterations')
        .insert([{ 
          upload_id: uploadId, 
          iteration_number: 1, 
          refined_code: analysisResult.optimizedCode,
          feedback: JSON.stringify(analysisResult.violations)
        }])
      
      if (iterationError) {
        Sentry.captureException(iterationError);
        console.error('Iteration insert error:', iterationError.message)
        return new Response(JSON.stringify({ error: iterationError.message, code: 'iteration_insert_error' }), { status: 500 })
      }

      // Update upload status
      await supabase
        .from('uploads')
        .update({ 
          status: 'processed',
          iteration_count: 1
        })
        .eq('id', uploadId)

      return new Response(JSON.stringify({ 
        success: true, 
        optimizedCode: analysisResult.optimizedCode,
        violations: analysisResult.summary
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (err) {
      Sentry.captureException(err);
      console.error('Process upload error during file handling:', err)
      return new Response(JSON.stringify({ error: (err as Error).message, code: 'file_handling_error' }), { status: 500 })
    }
  } catch (err) {
    Sentry.captureException(err);
    console.error('Process upload error:', err)
    return new Response(JSON.stringify({ error: err.message, code: 'process_upload_error' }), { status: 500 })
  }
})
