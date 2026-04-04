import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Brain } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash
      if (!hash.includes('access_token')) {
        // No token — might already be signed in, or bad link
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
        return
      }

      // Extract tokens from hash
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (!access_token || !refresh_token) {
        setError('Missing tokens in callback URL')
        return
      }

      // Set the session manually
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
      })

      if (sessionError) {
        setError(sessionError.message)
        return
      }

      if (data.session) {
        // Clean hash and go to dashboard
        window.history.replaceState(null, '', '/auth/callback')
        navigate('/dashboard', { replace: true })
      } else {
        setError('Failed to create session')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col items-center justify-center px-4">
      <Brain className="h-10 w-10 text-neon-400 mb-4" />
      {error ? (
        <div className="text-center">
          <p className="text-pink-400 mb-4">{error}</p>
          <a href="/login" className="text-neon-400 hover:text-neon-300">Back to login</a>
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
