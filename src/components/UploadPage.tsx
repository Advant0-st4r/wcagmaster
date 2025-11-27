// src/components/UploadPage.tsx
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  const onDrop = useCallback((acceptedFiles: File[]) => setFiles(acceptedFiles), [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const handleSubmit = async () => {
    setError(null)
    if (files.length === 0) return
    setUploading(true)

    try {
      // Enforce authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('You must be logged in to upload files')
        nav('/signup')
        return
      }

      for (const file of files) {
        // Validate file type (HTML only)
        if (!file.name.match(/\.(html|htm)$/i)) {
          setError(`Invalid file type: ${file.name}. Only HTML files are allowed.`)
          continue
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File too large: ${file.name}. Maximum size is 10MB.`)
          continue
        }

        // Upload to storage
        const path = `${user.id}/${Date.now()}-${file.name}`
        const { data: storageData, error: storageError } = await supabase.storage
          .from('uploads')
          .upload(path, file, { upsert: false })

        if (storageError) {
          setError(`Upload failed for ${file.name}: ${storageError.message}`)
          continue
        }

        // Insert upload record
        const { data: uploadRecord, error: dbError } = await supabase
          .from('uploads')
          .insert([{
            user_id: user.id,
            file_name: file.name,
            file_path: storageData.path,
            status: 'uploaded'
          }])
          .select()
          .single()

        if (dbError) {
          setError(`Database error for ${file.name}: ${dbError.message}`)
          continue
        }

        // Trigger processing
        const { error: funcError, data: funcData } = await supabase.functions.invoke('process-upload', {
          body: { uploadId: uploadRecord.id }
        })

        if (funcError || funcData?.error) {
          // Prefer backend error message/code
          const backendMsg = funcData?.error || funcError?.message
          setError(`Processing failed for ${file.name}: ${backendMsg}`)
          continue
        }
      }

      nav('/process')
    } catch (err: any) {
      setError(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <h2 className="text-2xl font-semibold mb-6">Upload Frontend Files</h2>

      <div 
        {...getRootProps({
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              (e.target as HTMLElement).click();
            }
          }
        })}
        className="border-2 border-dashed p-8 rounded-lg mb-6 text-center cursor-pointer hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 outline-none"
        role="button"
        aria-label="File upload area - drag and drop or click to select HTML files"
        tabIndex={0}
      >
        <input {...getInputProps()} aria-label="File input" tabIndex={-1} />
        <p className="text-gray-600">{isDragActive ? 'Drop files here...' : "Drag & drop HTML files here, or click to select"}</p>
      </div>


      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded" role="alert" aria-live="assertive">{error}</div>
      )}

      {files.length > 0 && (
        <ul className="mb-4">
          {files.map(f => <li key={f.name} className="text-gray-700">{f.name} — {Math.round(f.size/1024)} KB</li>)}
        </ul>
      )}

      <button 
        onClick={handleSubmit} 
        disabled={files.length === 0 || uploading}
        className="px-5 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
        aria-label={uploading ? 'Uploading files, please wait' : `Upload ${files.length} file(s) and apply WCAG practices`}
        tabIndex={0}
      >
        {uploading ? 'Uploading...' : 'Apply WCAG Practices'}
      </button>
    </div>
  )
}

