import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { Loader2, Mail, Brain } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required.'); return }

    setLoading(true)
    try {
      const { error: resetError } = await resetPassword(email)
      if (resetError) setError(resetError.message)
      else setSent(true)
    } catch {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Brain className="h-8 w-8 text-primary-600" />
          <span className="text-2xl font-bold text-gray-900">NeuronVault</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h1>
              <p className="text-sm text-gray-500 mb-4">We sent a reset link to <strong>{email}</strong></p>
              <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Back to login</Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl font-semibold text-gray-900">Reset password</h1>
                <p className="mt-1 text-sm text-gray-500">Enter your email to receive a reset link</p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
