import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export const config = {
  api: { bodyParser: false },
}

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook Error: ${err.message}` })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.metadata?.userId
    const isLifetime = session.mode === 'payment'

    if (userId) {
      await supabase.from('nv_profiles').update({
        plan: isLifetime ? 'lifetime' : 'pro',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription || null,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)

      // Log metric
      await supabase.from('nv_metrics').insert({
        metric_type: 'upgrade',
        metadata: { plan: isLifetime ? 'lifetime' : 'pro', userId },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object
    await supabase.from('nv_profiles').update({
      plan: 'free',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    }).eq('stripe_subscription_id', subscription.id)
  }

  res.json({ received: true })
}
