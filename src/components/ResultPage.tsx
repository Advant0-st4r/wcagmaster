// src/components/ResultPage.tsx
import { useEffect, useState } from 'react'
import ReactDiffViewer from 'react-diff-viewer-continued'
import { supabase } from '../supabase'

export default function ResultPage() {
  const [original, setOriginal] = useState('// loading original')
  const [optimized, setOptimized] = useState('// loading optimized')
  const [rating, setRating] = useState<number | null>(null)
  const [hasRated, setHasRated] = useState(false)

  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Please log in to view results')
          return
        }
        const { data: upload, error: uploadError } = await supabase.from('uploads')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (uploadError || !upload) {
          setError('No uploads found')
          return
        }
        // Download original file from storage
        try {
          const { data: blobData, error: downloadError } = await supabase.storage
            .from('uploads')
            .download(upload.file_path)
          if (!downloadError && blobData) {
            const originalText = await blobData.text()
            setOriginal(originalText)
          }
        } catch (err) {
          setOriginal(`// Original file: ${upload.file_name}\n// Could not load file content`)
        }
        // Get latest optimized code from iterations (include id for rating updates)
        const { data: iteration, error: iterError } = await supabase.from('iterations')
          .select('id, refined_code, iteration_rating')
          .eq('upload_id', upload.id)
          .order('iteration_number', { ascending: false })
          .limit(1)
          .single()
        if (iterError) {
          setOptimized('// No optimized version available yet')
        } else {
          setOptimized(iteration?.refined_code ?? '// Processing not complete')
          if (iteration?.iteration_rating) {
            setRating(iteration.iteration_rating)
            setHasRated(true)
          }
        }
      } catch (err: any) {
        setError(`Error loading results: ${err.message}`)
      }
    }
    fetchData()
  }, [])

  const downloadOptimized = () => {
    const blob = new Blob([optimized], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'optimized.html'
    a.click()
  }

  const downloadProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in to download project')
        return
      }

      const { data: upload } = await supabase.from('uploads')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!upload) {
        setError('No upload found')
        return
      }

      const { data, error } = await supabase.functions.invoke('download-project', {
        body: { uploadId: upload.id }
      })

      if (error) {
        setError('Download failed: ' + error.message)
        return
      }

      // Create blob from response and trigger download
      const blob = new Blob([data], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wcag-project-${upload.id.substring(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setError('Error downloading project: ' + err.message)
    }
  }

  const submitRating = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in to submit a rating')
        return
      }

      // Find latest upload for user
      const { data: upload } = await supabase.from('uploads')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!upload) {
        setError('No upload found to rate')
        return
      }

      // Get latest iteration id
      const { data: iter } = await supabase.from('iterations')
        .select('id')
        .eq('upload_id', upload.id)
        .order('iteration_number', { ascending: false })
        .limit(1)
        .single()

      if (!iter) {
        setError('No iteration found to rate')
        return
      }

      // Update iteration with rating
      const { error: updateErr } = await supabase.from('iterations')
        .update({ iteration_rating: rating })
        .eq('id', iter.id)

      if (updateErr) {
        setError('Failed to save rating: ' + updateErr.message)
        return
      }

      setHasRated(true)
      // Optionally show a success message
    } catch (err: any) {
      setError('Error submitting rating: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h2 className="text-2xl font-semibold mb-6">Optimized Code Preview</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded" role="alert" aria-live="assertive">{error}</div>
      )}

      <ReactDiffViewer oldValue={original} newValue={optimized} splitView={true} showDiffOnly={false} />

      <div className="mt-6 flex gap-3">
        <button 
          onClick={downloadOptimized} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
          aria-label="Download optimized HTML file"
          tabIndex={0}
        >
          Download Optimized File
        </button>
        
        <button 
          onClick={downloadProject} 
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 outline-none"
          aria-label="Download complete project with all iterations as ZIP file"
          tabIndex={0}
        >
          Download Complete Project (ZIP)
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Rate this optimization (1-10)</h3>
        <div className="flex gap-2 items-center">
          <select
            value={rating ?? ''}
            onChange={(e) => setRating(Number(e.target.value))}
            disabled={hasRated}
            className="p-2 border rounded outline-none"
            aria-label="Rate this optimization from 1 to 10"
            tabIndex={0}
          >
            <option value="">Select rating</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          <button
            onClick={submitRating}
            className="px-4 py-2 bg-green-600 text-white rounded outline-none"
            disabled={hasRated || rating === null}
            aria-label={hasRated ? 'Rated' : 'Submit rating'}
            tabIndex={0}
          >
            {hasRated ? 'Rated' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  )
}


