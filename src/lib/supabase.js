import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Capture the hash BEFORE createClient can consume it
const initialHash = window.location.hash

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    detectSessionInUrl: false
  }
})

// Export the captured hash so AuthContext can use it
export { initialHash }
