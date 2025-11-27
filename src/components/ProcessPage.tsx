// src/components/ProcessPage.tsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function ProcessPage() {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [iteration, setIteration] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [preview, setPreview] = useState('// No preview yet')
  const navigate = useNavigate()
  const maxIterations = 3

  useEffect(() => {
    const loadLatestUpload = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          navigate('/signup')
          return
        }

        const { data, error } = await supabase.from('uploads')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'processed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          console.error('Failed to load upload:', error)
          navigate('/upload')
          return
        }
        
        if (data) {
          setUploadId(data.id)
          
          // Load latest refined code from iterations
          const { data: iterationData } = await supabase
            .from('iterations')
            .select('refined_code')
            .eq('upload_id', data.id)
            .order('iteration_number', { ascending: false })
            .limit(1)
            .single()
          
          setPreview(iterationData?.refined_code ?? `// Processing: ${data.file_name}`)
        }
      } catch (err: any) {
        console.error('Error loading upload:', err)
        navigate('/upload')
      }
    }
    loadLatestUpload()
  }, [navigate])

  const handleRefine = async () => {
    if (!uploadId) {
      alert('No upload found. Please upload a file first.')
      navigate('/upload')
      return
    }

    try {
      // Invoke Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('refine-code', {
        body: { uploadId, feedback }
      })

      if (error) {
        alert(`Refinement failed: ${error.message}`)
        return
      }

      if (data && data.refinedCode) {
        setPreview(data.refinedCode)
      }

      setFeedback('')
      
      if (iteration < maxIterations) {
        setIteration(prev => prev + 1)
      } else {
        navigate('/result')
      }
    } catch (err: any) {
      alert(`Error during refinement: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h2 className="text-2xl font-semibold mb-4">Refine Optimizations — Iteration {iteration}/{maxIterations}</h2>

      <pre className="bg-white p-4 rounded shadow max-h-80 overflow-auto mb-4">{preview}</pre>

      <label htmlFor="feedback-input" className="block text-sm font-medium mb-2">
        Your Feedback (optional)
      </label>
      <textarea
        id="feedback-input"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Provide feedback (e.g., 'Improve mobile accessibility')"
        className="w-full p-3 border rounded mb-4 min-h-[120px] focus:ring-2 focus:ring-blue-500"
        aria-describedby="feedback-hint"
      />
      <p id="feedback-hint" className="text-sm text-gray-600 mb-4">
        Describe specific improvements you'd like (mobile, contrast, semantic structure, etc.)
      </p>

      <div className="flex gap-3">
        <button 
          onClick={handleRefine} 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
          aria-label={`Submit feedback and refine code - Iteration ${iteration} of ${maxIterations}`}
        >
          Submit Feedback & Refine ({iteration}/{maxIterations})
        </button>
      </div>
    </div>
  )
}

