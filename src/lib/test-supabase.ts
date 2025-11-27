// src/lib/test-supabase.ts
import { supabase } from './supabase-client'

async function test() {
  const { data, error } = await supabase.from('uploads').select('*')
  if (error) console.error(error)
  else console.log('Uploads:', data)
}

test()
