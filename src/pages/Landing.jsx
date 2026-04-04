import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  Brain, GitBranch, History, Search, Link2, Download,
  ArrowRight, Check, Zap, Shield, Code
} from 'lucide-react'

const features = [
  { icon: History, title: 'Version History', desc: 'Every edit creates a version. See exactly what changed, when, and revert anytime.', glow: 'glow-green' },
  { icon: GitBranch, title: 'Branch Ideas', desc: 'Fork a note to explore variations. Merge the best version back when ready.', glow: 'glow-blue' },
  { icon: Link2, title: 'Bidirectional Links', desc: 'Connect ideas with [[wiki-links]]. See all backlinks to any note automatically.', glow: 'glow-pink' },
  { icon: Search, title: 'Full-Text Search', desc: 'Find anything instantly across your entire vault with powerful search.', glow: 'glow-orange' },
  { icon: Download, title: 'Markdown Export', desc: 'Your notes are yours. Export as Markdown anytime. No lock-in.', glow: 'glow-green' },
  { icon: Code, title: 'Developer-First', desc: 'Built for devs. Monospace editor, syntax highlighting, keyboard shortcuts.', glow: 'glow-blue' },
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
    color: 'neon',
  },
  {
    name: 'Pro',
    price: '$9',
    period: '/month',
    features: ['Unlimited notes', 'Unlimited versions', 'Branching & merging', 'Priority support', 'Template imports'],
    cta: 'Start Pro',
    href: '/signup',
    highlighted: true,
    color: 'cyber',
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
    color: 'pink',
  },
]

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-dark-800">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-neon-400" />
          <span className="text-xl font-bold text-dark-50 text-glow-green">NeuronVault</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="btn-haptic rounded-lg bg-neon-400 px-4 py-2 text-sm font-semibold text-dark-900 hover:bg-neon-300 glow-green">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-dark-200 hover:text-dark-50">Log in</Link>
              <Link to="/signup" className="btn-haptic rounded-lg bg-neon-400 px-4 py-2 text-sm font-semibold text-dark-900 hover:bg-neon-300 glow-green">
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center fade-in">
        <div className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1 text-xs font-medium text-neon-400 mb-6">
          <Zap className="h-3 w-3" /> Built for developers
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
          <span className="text-dark-50">Version control for</span><br />
          <span className="text-neon-400 text-glow-green">your knowledge</span>
        </h1>
        <p className="text-lg text-dark-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          Like GitHub, but for your notes. Track every change, branch ideas,
          link thoughts together, and never lose a single insight.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/signup"
            className="btn-haptic inline-flex items-center gap-2 rounded-xl bg-neon-400 px-6 py-3 text-sm font-semibold text-dark-900 shadow-lg glow-green hover:bg-neon-300 pulse-glow">
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features"
            className="btn-haptic inline-flex items-center gap-2 rounded-xl glass px-6 py-3 text-sm font-semibold text-dark-100 hover:bg-dark-600">
            See Features
          </a>
        </div>
      </section>

      {/* Demo preview */}
      <section className="max-w-5xl mx-auto px-4 pb-20 fade-in">
        <div className="glass rounded-2xl shadow-2xl p-1 glow-green" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-1.5 px-4 py-2">
            <div className="w-3 h-3 rounded-full bg-pink-500/80" />
            <div className="w-3 h-3 rounded-full bg-flame-500/80" />
            <div className="w-3 h-3 rounded-full bg-neon-500/80" />
            <span className="ml-3 text-xs text-dark-400 font-mono">NeuronVault</span>
          </div>
          <div className="bg-dark-900 rounded-xl m-1 p-6 font-mono text-sm">
            <div className="text-neon-400 mb-1">{"# My Project Ideas"}</div>
            <div className="text-dark-500 mb-3">&nbsp;</div>
            <div className="text-cyber-400">{"## API Design"}</div>
            <div className="text-dark-300">{"Use REST for public endpoints, gRPC for internal."}</div>
            <div className="text-dark-300">{"See "}<span className="text-cyber-400 underline decoration-dotted">{"[[Architecture Decisions]]"}</span>{" for context."}</div>
            <div className="text-dark-500 mb-3">&nbsp;</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neon-400">v12</span>
              <span className="text-dark-600">|</span>
              <span className="text-neon-400">+3 lines</span>
              <span className="text-pink-400">-1 line</span>
              <span className="text-dark-600">|</span>
              <span className="text-dark-400">2 backlinks</span>
              <span className="text-dark-600">|</span>
              <span className="text-flame-400">main</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-50 mb-3">Everything you need to think better</h2>
            <p className="text-dark-300">Git-powered knowledge management, designed for how developers actually think.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {features.map((f) => (
              <div key={f.title} className={`glass rounded-xl p-6 card-hover`}>
                <f.icon className="h-8 w-8 text-neon-400 mb-3" />
                <h3 className="font-semibold text-dark-50 mb-1">{f.title}</h3>
                <p className="text-sm text-dark-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark-50 mb-3">Simple, transparent pricing</h2>
            <p className="text-dark-300">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 stagger">
            {plans.map((plan) => (
              <div key={plan.name} className={`glass rounded-xl p-6 relative card-hover ${
                plan.highlighted ? 'glow-green border border-neon-400/30' : ''
              }`}>
                {plan.badge && (
                  <span className="absolute -top-3 right-4 bg-pink-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full glow-pink">
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-semibold text-dark-50 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-dark-50">{plan.price}</span>
                  <span className="text-sm text-dark-400">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-dark-200">
                      <Check className="h-4 w-4 text-neon-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.href}
                  className={`btn-haptic block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold ${
                    plan.highlighted
                      ? 'bg-neon-400 text-dark-900 hover:bg-neon-300 glow-green'
                      : 'glass text-dark-100 hover:bg-dark-500'
                  }`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="glass rounded-2xl p-12 glow-green">
            <h2 className="text-3xl font-bold text-dark-50 mb-3">Ready to version your brain?</h2>
            <p className="text-dark-300 mb-6">Join developers who never lose an idea again.</p>
            <Link to="/signup"
              className="btn-haptic inline-flex items-center gap-2 rounded-xl bg-neon-400 px-6 py-3 text-sm font-semibold text-dark-900 hover:bg-neon-300 glow-green pulse-glow">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-8 flex items-center justify-between text-sm text-dark-400">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-neon-400" />
          <span>NeuronVault</span>
        </div>
        <span>Built with care. Your data is yours.</span>
      </footer>
    </div>
  )
}
