// Sentry integration for error logging
import * as Sentry from "npm:@sentry/node";
Sentry.init({ dsn: Deno.env.get("SENTRY_DSN") });
// supabase/functions/download-project/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

// Minimal ZIP file generation (simple ZIP without compression for text files)
function createSimpleZip(files: { name: string; content: string }[]): Uint8Array {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  
  // Local file headers + data
  let offset = 0
  const centralDir: Uint8Array[] = []
  
  files.forEach(file => {
    const nameBytes = encoder.encode(file.name)
    const contentBytes = encoder.encode(file.content)
    
    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(localHeader.buffer)
    view.setUint32(0, 0x04034b50, true) // signature
    view.setUint16(4, 20, true) // version
    view.setUint16(6, 0, true) // flags
    view.setUint16(8, 0, true) // compression (0 = none)
    view.setUint16(10, 0, true) // time
    view.setUint16(12, 0, true) // date
    view.setUint32(14, 0, true) // crc32 (simplified)
    view.setUint32(18, contentBytes.length, true) // compressed size
    view.setUint32(22, contentBytes.length, true) // uncompressed size
    view.setUint16(26, nameBytes.length, true) // filename length
    view.setUint16(28, 0, true) // extra field length
    localHeader.set(nameBytes, 30)
    
    chunks.push(localHeader, contentBytes)
    
    // Central directory entry
    const centralEntry = new Uint8Array(46 + nameBytes.length)
    const cdView = new DataView(centralEntry.buffer)
    cdView.setUint32(0, 0x02014b50, true) // signature
    cdView.setUint16(4, 20, true) // version made by
    cdView.setUint16(6, 20, true) // version needed
    cdView.setUint16(8, 0, true) // flags
    cdView.setUint16(10, 0, true) // compression
    cdView.setUint16(12, 0, true) // time
    cdView.setUint16(14, 0, true) // date
    cdView.setUint32(16, 0, true) // crc32
    cdView.setUint32(20, contentBytes.length, true) // compressed
    cdView.setUint32(24, contentBytes.length, true) // uncompressed
    cdView.setUint16(28, nameBytes.length, true) // filename length
    cdView.setUint16(30, 0, true) // extra length
    cdView.setUint16(32, 0, true) // comment length
    cdView.setUint16(34, 0, true) // disk number
    cdView.setUint16(36, 0, true) // internal attr
    cdView.setUint32(38, 0, true) // external attr
    cdView.setUint32(42, offset, true) // local header offset
    centralEntry.set(nameBytes, 46)
    centralDir.push(centralEntry)
    
    offset += localHeader.length + contentBytes.length
  })
  
  // End of central directory
  const centralDirSize = centralDir.reduce((sum, e) => sum + e.length, 0)
  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, 0x06054b50, true) // signature
  endView.setUint16(4, 0, true) // disk number
  endView.setUint16(6, 0, true) // disk with central dir
  endView.setUint16(8, files.length, true) // entries on this disk
  endView.setUint16(10, files.length, true) // total entries
  endView.setUint32(12, centralDirSize, true) // central dir size
  endView.setUint32(16, offset, true) // central dir offset
  endView.setUint16(20, 0, true) // comment length
  
  const totalSize = offset + centralDirSize + endRecord.length
  const result = new Uint8Array(totalSize)
  let pos = 0
  chunks.forEach(chunk => {
    result.set(chunk, pos)
    pos += chunk.length
  })
  centralDir.forEach(entry => {
    result.set(entry, pos)
    pos += entry.length
  })
  result.set(endRecord, pos)
  
  return result
}

serve(async (req) => {
  try {
    const { uploadId } = await req.json()
    
    if (!uploadId) {
      Sentry.captureMessage('Missing uploadId in download-project');
      return new Response(JSON.stringify({ error: 'Missing uploadId', code: 'missing_upload_id' }), { status: 400 })
    }
    
    // Fetch upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .select('*')
      .eq('id', uploadId)
      .single()
    
    if (uploadError || !upload) {
      Sentry.captureMessage('Upload not found in download-project');
      return new Response(JSON.stringify({ error: 'Upload not found', code: 'upload_not_found' }), { status: 404 })
    }
    
    // Get all iterations for this upload
    const { data: iterations, error: iterError } = await supabase
      .from('iterations')
      .select('*')
      .eq('upload_id', uploadId)
      .order('iteration_number', { ascending: true })
    
    if (iterError) {
      Sentry.captureException(iterError);
      return new Response(JSON.stringify({ error: iterError.message, code: 'iteration_query_error' }), { status: 500 })
    }
    
    // Download original file
    let originalContent = ''
    try {
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('uploads')
        .download(upload.file_path)
      if (downloadError || !fileBlob) {
        originalContent = `<!-- Original file: ${upload.file_name} -->\n<!-- Could not retrieve original content: ${downloadError?.message || 'no blob'} -->`
      } else {
        originalContent = await fileBlob.text()
      }
    } catch (err) {
      originalContent = `<!-- Original file: ${upload.file_name} -->\n<!-- Could not retrieve original content: ${(err as Error).message} -->`
    }
    
    // Build ZIP with original + all iterations
    const files: { name: string; content: string }[] = [
      {
        name: `original-${upload.file_name}`,
        content: originalContent
      }
    ]

    // If no iterations, return a clear error
    if (!iterations || iterations.length === 0) {
      Sentry.captureMessage('No iterations found for download-project');
      return new Response(JSON.stringify({ error: 'No iterations found for this project.', code: 'no_iterations' }), { status: 404 })
    }
    
    iterations?.forEach((iter: any, idx: number) => {
      files.push({
        name: `iteration-${iter.iteration_number}-optimized.html`,
        content: iter.refined_code || '<!-- No content -->'
      })
      
      if (iter.feedback) {
        files.push({
          name: `iteration-${iter.iteration_number}-feedback.txt`,
          content: iter.feedback
        })
      }
    })
    
    // Add summary file
    const summary = `WCAG Optimization Project Summary
=====================================
Project: ${upload.file_name}
Upload Date: ${upload.created_at}
Total Iterations: ${iterations?.length || 0}
Status: ${upload.status}

Iterations:
${iterations?.map((iter: any) => `- Iteration ${iter.iteration_number}: ${iter.feedback ? iter.feedback.substring(0, 100) : 'No feedback'}${iter.iteration_rating ? ` (Rating: ${iter.iteration_rating}/10)` : ''}`).join('\n')}

Latest optimized code is in: iteration-${iterations?.[iterations.length - 1]?.iteration_number || 0}-optimized.html
`
    
    files.push({
      name: 'README.txt',
      content: summary
    })
    
    const zipBytes = createSimpleZip(files)
    
    // Ensure we use a true ArrayBuffer, not SharedArrayBuffer
    const ab = new Uint8Array(zipBytes).buffer;
    return new Response(new Blob([ab], { type: 'application/zip' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="wcag-project-${uploadId.substring(0, 8)}.zip"`
      }
    })
  } catch (err) {
    Sentry.captureException(err);
    console.error('Download project error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message, code: 'download_project_error' }), { status: 500 })
  }
})
