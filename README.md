# NeuronVault

**"GitHub for the Brain"** — git-style version control for your notes and knowledge.

Live at [neuronvault.tech](https://neuronvault.tech)

## Features

- **Version control for notes** — create, edit, branch, and merge notes like code
- **Diff viewer** — see exactly what changed between versions
- **Wiki-links** — bidirectional `[[links]]` between notes for connected thinking
- **Markdown editor** — full markdown support with live preview
- **Full-text search** — find anything instantly across all your notes
- **Stripe payments** — Free tier (50 notes) / Pro $9/mo / Lifetime $49

## Tech Stack

- **React 19** + **React Router 7**
- **Vite 7**
- **Tailwind CSS 4**
- **Supabase** (Auth, PostgreSQL, Real-time)
- **Stripe** (Checkout Sessions API)
- **Vercel** (deployment)

## Theme

Cyberpunk neon — dark backgrounds with green, blue, pink, and orange glow effects. Glass-card UI with smooth animations.

## Architecture

```
src/
├── pages/          # One file per screen
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── hooks/          # Custom hooks
├── lib/            # Business logic, API clients
└── assets/         # Static images/icons
```

## Getting Started

```bash
git clone https://github.com/noahgniffke-sys/neuronvault.git
cd neuronvault
npm install
npm run dev
```

## License

Private project by Noah Gniffke.
