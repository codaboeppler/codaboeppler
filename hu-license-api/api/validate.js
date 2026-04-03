// POST /api/validate
// Validates a license key against Stripe subscriptions
const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { license_key } = req.body || {};

  if (!license_key) {
    return res.status(400).json({ valid: false, error: 'License key is required' });
  }

  try {
    // Search for subscriptions with this license key in metadata
    const subscriptions = await stripe.subscriptions.search({
      query: `metadata["license_key"]:"${license_key}"`,
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(200).json({
        valid: false,
        error: 'License key not found'
      });
    }

    const sub = subscriptions.data[0];

    // Check subscription status
    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(sub.status)) {
      return res.status(200).json({
        valid: false,
        error: 'Subscription is ' + sub.status + '. Please renew your plan.',
        status: sub.status
      });
    }

    // Get customer info
    let customerEmail = sub.metadata.customer_email || '';
    if (!customerEmail && sub.customer) {
      try {
        const customer = await stripe.customers.retrieve(sub.customer);
        customerEmail = customer.email || '';
      } catch (_e) {
        // Customer might have been deleted
      }
    }

    return res.status(200).json({
      valid: true,
      email: customerEmail,
      plan: 'pro',
      status: sub.status,
      current_period_end: sub.current_period_end,
      cancel_at_period_end: sub.cancel_at_period_end
    });

  } catch (err) {
    console.error('Validation error:', err);
    return res.status(500).json({
      valid: false,
      error: 'Server error validating license'
    });
  }
};
