import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, email } = req.body
  const isLifetime = req.query.lifetime === 'true'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: isLifetime ? 'payment' : 'subscription',
      customer_email: email,
      line_items: [{
        price: isLifetime
          ? process.env.STRIPE_LIFETIME_PRICE_ID
          : process.env.STRIPE_PRO_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${req.headers.origin}/settings?success=true`,
      cancel_url: `${req.headers.origin}/settings?canceled=true`,
      metadata: { userId },
    })

    res.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ error: err.message })
  }
}
