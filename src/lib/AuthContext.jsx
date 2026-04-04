import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let resolved = false

    // Listen for auth changes FIRST — this catches the OAuth hash callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolved = true
      setUser(session?.user ?? null)
      setLoading(false)
      // Clean the hash from the URL if present
      if (window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    })

    // Fallback: if no auth event fires within 2s (normal page load with no hash),
    // check for an existing session manually
    const timer = setTimeout(() => {
      if (!resolved) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setUser(session?.user ?? null)
          setLoading(false)
        })
      }
    }, 100)

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })

  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
