import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Brain } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard', { replace: true })
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true })
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col items-center justify-center px-4">
      <Brain className="h-10 w-10 text-neon-400 mb-4" />
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-400 mx-auto mb-4" />
      <p className="text-dark-300">Signing you in...</p>
    </div>
  )
}
