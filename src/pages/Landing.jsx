import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  Brain, GitBranch, History, Search, Link2, Download,
  ArrowRight, Check, Zap, Shield, Code
} from 'lucide-react'

const features = [
  { icon: History, title: 'Version History', desc: 'Every edit creates a version. See exactly what changed, when, and revert anytime.' },
  { icon: GitBranch, title: 'Branch Ideas', desc: 'Fork a note to explore variations. Merge the best version back when ready.' },
  { icon: Link2, title: 'Bidirectional Links', desc: 'Connect ideas with [[wiki-links]]. See all backlinks to any note automatically.' },
  { icon: Search, title: 'Full-Text Search', desc: 'Find anything instantly across your entire vault with powerful search.' },
  { icon: Download, title: 'Markdown Export', desc: 'Your notes are yours. Export as Markdown anytime. No lock-in.' },
  { icon: Code, title: 'Developer-First', desc: 'Built for devs. Monospace editor, syntax highlighting, keyboard shortcuts.' },
]

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['50 notes', 'Version history', 'Bidirectional links', 'Full-text search', 'Markdown export'],
    cta: 'Get Started',
    href: '/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    features: ['Unlimited notes', 'Unlimited versions', 'Branching & merging', 'Priority support', 'Template imports'],
    cta: 'Start Pro',
    href: '/signup',
    highlighted: true,
  },
  {
    name: 'Lifetime',
    price: '$49',
    period: 'one-time',
    features: ['Everything in Pro', 'Pay once, keep forever', 'Early adopter badge', 'Shape the roadmap', 'Limited to first 10 users'],
    cta: 'Grab Lifetime',
    href: '/signup',
    highlighted: false,
    badge: 'Limited',
  },
]

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-primary-600" />
          <span className="text-xl font-bold text-gray-900">NeuronVault</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Log in</Link>
              <Link to="/signup" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition">
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-xs font-medium text-primary-700 mb-6">
          <Zap className="h-3 w-3" /> Built for developers
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight mb-6">
          Version control for<br />
          <span className="text-primary-600">your knowledge</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          Like GitHub, but for your notes. Track every change, branch ideas,
          link thoughts together, and never lose a single insight.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition">
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
            See Features
          </a>
        </div>
      </section>

      {/* Demo preview */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-1">
          <div className="flex items-center gap-1.5 px-4 py-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-3 text-xs text-gray-500 font-mono">NeuronVault</span>
          </div>
          <div className="bg-gray-950 rounded-xl m-1 p-6 font-mono text-sm">
            <div className="text-green-400 mb-1">{"# My Project Ideas"}</div>
            <div className="text-gray-400 mb-3">&nbsp;</div>
            <div className="text-gray-300">{"## API Design"}</div>
            <div className="text-gray-400">{"Use REST for public endpoints, gRPC for internal."}</div>
            <div className="text-gray-400">{"See [[Architecture Decisions]] for context."}</div>
            <div className="text-gray-400 mb-3">&nbsp;</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-primary-400">v12</span>
              <span className="text-gray-600">|</span>
              <span className="text-green-400">+3 lines</span>
              <span className="text-red-400">-1 line</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-500">2 backlinks</span>
              <span className="text-gray-600">|</span>
              <span className="text-accent-400">main</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything you need to think better</h2>
            <p className="text-gray-500">Git-powered knowledge management, designed for how developers actually think.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-200 hover:shadow-sm transition">
                <f.icon className="h-8 w-8 text-primary-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h2>
            <p className="text-gray-500">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`rounded-xl border p-6 relative ${
                plan.highlighted
                  ? 'border-primary-400 bg-primary-50/50 shadow-lg shadow-primary-600/10'
                  : 'border-gray-200 bg-white'
              }`}>
                {plan.badge && (
                  <span className="absolute -top-3 right-4 bg-accent-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-semibold text-gray-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-primary-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.href}
                  className={`block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    plan.highlighted
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to version your brain?</h2>
          <p className="text-gray-400 mb-6">Join developers who never lose an idea again.</p>
          <Link to="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-400 transition">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span>NeuronVault</span>
        </div>
        <span>Built with care. Your data is yours.</span>
      </footer>
    </div>
  )
}
