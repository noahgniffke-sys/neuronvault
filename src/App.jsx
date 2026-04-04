import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import NoteEditor from './pages/NoteEditor'
import NoteHistory from './pages/NoteHistory'
import NoteDiff from './pages/NoteDiff'
import Settings from './pages/Settings'
import ImportTemplate from './pages/ImportTemplate'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  )
  if (!user) return <Navigate to="/login" />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/note/:id" element={<ProtectedRoute><NoteEditor /></ProtectedRoute>} />
      <Route path="/note/:id/history" element={<ProtectedRoute><NoteHistory /></ProtectedRoute>} />
      <Route path="/note/:id/diff/:v1/:v2" element={<ProtectedRoute><NoteDiff /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/import" element={<ProtectedRoute><ImportTemplate /></ProtectedRoute>} />
    </Routes>
  )
}
