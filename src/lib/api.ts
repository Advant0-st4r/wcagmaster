// API utilities for WCAG Master
import { supabase } from './supabase-client'

export async function processUpload(uploadId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('process-upload', {
      body: { uploadId }
    })

    if (error) throw error
    return data
  } catch (err: any) {
    throw new Error(err.message || 'Failed to process upload')
  }
}

export async function refineCode(uploadId: string, feedback: string) {
  try {
    const { data, error } = await supabase.functions.invoke('refine-code', {
      body: { uploadId, feedback }
    })

    if (error) throw error
    return data
  } catch (err: any) {
    throw new Error(err.message || 'Failed to refine code')
  }
}

export async function getLatestUpload(userId: string) {
  const { data, error } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) throw error
  return data
}

export async function getIterations(uploadId: string) {
  const { data, error } = await supabase
    .from('iterations')
    .select('*')
    .eq('upload_id', uploadId)
    .order('iteration_number', { ascending: false })

  if (error) throw error
  return data
}

