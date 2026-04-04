import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Brain, CreditCard, Loader2, Crown } from 'lucide-react'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from('nv_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [user.id])

  async function handleUpgrade(lifetime = false) {
    setUpgrading(true)
    try {
      const endpoint = lifetime ? '/api/create-checkout?lifetime=true' : '/api/create-checkout'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error('Checkout failed:', err)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  async function handleManageBilling() {
    try {
      const res = await fetch('/api/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error('Portal failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  const isPaid = profile?.plan === 'pro' || profile?.plan === 'lifetime'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Account */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-900">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-900">{profile?.display_name || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Plan</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isPaid ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {profile?.plan === 'lifetime' ? 'Lifetime' : profile?.plan === 'pro' ? 'Pro' : 'Free'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Notes</span>
              <span className="text-gray-900">{profile?.note_count || 0}{!isPaid ? ' / 50' : ''}</span>
            </div>
          </div>
        </div>

        {/* Plan */}
        {!isPaid && (
          <div className="bg-gradient-to-br from-primary-50 to-accent-50 rounded-xl border border-primary-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-5 w-5 text-primary-600" />
              <h2 className="text-sm font-semibold text-gray-900">Upgrade to Pro</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Unlimited notes, unlimited versions, priority support.</p>
            <div className="flex gap-3">
              <button onClick={() => handleUpgrade(false)} disabled={upgrading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition">
                {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                $9/month
              </button>
              <button onClick={() => handleUpgrade(true)} disabled={upgrading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-primary-600 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:opacity-50 transition">
                $49 lifetime
              </button>
            </div>
          </div>
        )}

        {/* Billing */}
        {isPaid && profile?.stripe_customer_id && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Billing</h2>
            <button onClick={handleManageBilling}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition">
              Manage billing & invoices
            </button>
          </div>
        )}

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Session</h2>
          <button onClick={signOut}
            className="text-sm text-red-600 hover:text-red-700 font-medium transition">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
