import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Brain } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [debug, setDebug] = useState({})

  useEffect(() => {
    async function handleAuth() {
      const hash = window.location.hash
      const hasToken = hash.includes('access_token')

      // Gather debug info
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
      const keyPrefix = import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) || 'MISSING'

      setDebug({
        hasHash: hasToken,
        hashLength: hash.length,
        supabaseUrl: supabaseUrl || 'MISSING',
        hasKey,
        keyPrefix
      })

      // Try getSession first (Supabase may have auto-processed the hash)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (sessionData?.session) {
        navigate('/dashboard', { replace: true })
        return
      }

      // If no session yet, try extracting tokens from hash manually
      if (hasToken) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        setDebug(prev => ({
          ...prev,
          hasAccessToken: !!access_token,
          hasRefreshToken: !!refresh_token,
          refreshTokenLength: refresh_token?.length,
          getSessionError: sessionError?.message
        }))

        if (access_token && refresh_token) {
          const { data, error: setError2 } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (data?.session) {
            window.history.replaceState(null, '', '/auth/callback')
            navigate('/dashboard', { replace: true })
            return
          }

          setDebug(prev => ({
            ...prev,
            setSessionError: setError2?.message || 'No session returned'
          }))
          setError(setError2?.message || 'Failed to create session')
          return
        }
      }

      // Listen for auth state changes as fallback
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        setDebug(prev => ({ ...prev, authEvent: event, hasSession: !!session }))
        if (session) {
          navigate('/dashboard', { replace: true })
        }
      })

      // Timeout
      setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            setError('Sign-in timed out. Please try again.')
          }
        })
      }, 8000)

      return () => subscription.unsubscribe()
    }

    handleAuth()
  }, [navigate])

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col items-center justify-center px-4">
      <Brain className="h-10 w-10 text-neon-400 mb-4" />
      {error ? (
        <div className="text-center">
          <p className="text-pink-400 mb-4">{error}</p>
          <a href="/login" className="text-neon-400 hover:text-neon-300">Back to login</a>
          <pre className="mt-6 text-left text-xs text-dark-400 bg-dark-900 p-4 rounded-lg max-w-md overflow-auto">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-400 mx-auto mb-4" />
          <p className="text-dark-300">Signing you in...</p>
        </div>
      )}
    </div>
  )
}
