import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Brain } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    // Supabase auto-detects the #access_token hash and creates the session.
    // We just need to wait for it to finish, then redirect.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard', { replace: true })
      }
    })

    // Also check if session already exists (in case the event already fired)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true })
      }
    })

    // Timeout — if nothing happens after 5 seconds, show error
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setError('Sign-in timed out. Please try again.')
        }
      })
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
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
