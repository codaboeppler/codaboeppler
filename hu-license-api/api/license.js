// GET /api/license?session_id=cs_XXXX
// After checkout, retrieves the license key for the customer
const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({ error: 'session_id is required' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session.subscription) {
      return res.status(400).json({ error: 'No subscription found for this session' });
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const licenseKey = subscription.metadata?.license_key;

    if (!licenseKey) {
      // Webhook might not have processed yet, wait and retry
      return res.status(202).json({
        ready: false,
        message: 'License is being generated, please try again in a few seconds'
      });
    }

    return res.status(200).json({
      ready: true,
      license_key: licenseKey,
      email: session.customer_details?.email || '',
      plan: 'pro'
    });

  } catch (err) {
    console.error('License retrieval error:', err);
    return res.status(500).json({ error: err.message });
  }
};
