import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { customerId } = req.body

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/settings`,
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    res.status(500).json({ error: err.message })
  }
}
