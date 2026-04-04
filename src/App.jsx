import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import { useEffect } from 'react'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import NoteEditor from './pages/NoteEditor'
import NoteHistory from './pages/NoteHistory'
import NoteDiff from './pages/NoteDiff'
import Settings from './pages/Settings'
import ImportTemplate from './pages/ImportTemplate'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-400" />
    </div>
  )
  if (!user) return <Navigate to="/login" />
  return children
}

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase client auto-detects the hash fragment and creates the session.
    // We just need to wait for it to finish, then redirect.
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        clearInterval(interval)
        navigate('/dashboard', { replace: true })
      }
    }, 500)

    // Timeout after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
      navigate('/login', { replace: true })
    }, 10000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-400" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/note/:id" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
      <Route path="/note/:id/history" element={<ProtectedRoute><NoteHistory /></ProtectedRoute>} />
      <Route path="/note/:id/diff/:v1/:v2" element={<ProtectedRoute><NoteDiff /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><ImportTemplate /></ProtectedRoute>} />
    </Routes>
  )
}
