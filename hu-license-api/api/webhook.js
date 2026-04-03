// POST /api/webhook
// Stripe webhook - generates license keys on successful payment
const Stripe = require('stripe');
const crypto = require('crypto');

// In production, use a database (Supabase, PlanetScale, etc.)
// For now, we use Stripe metadata to store the license key on the subscription

function generateLicenseKey() {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return segments.join('-'); // Format: A1B2-C3D4-E5F6-G7H8
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // Vercel sends raw body as buffer
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;

      if (session.mode === 'subscription' && session.subscription) {
        const licenseKey = generateLicenseKey();
        const customerEmail = session.customer_details?.email || session.customer_email || '';

        // Store license key in subscription metadata
        await stripe.subscriptions.update(session.subscription, {
          metadata: {
            license_key: licenseKey,
            activated_at: new Date().toISOString(),
            customer_email: customerEmail
          }
        });

        // Also store on customer for easy lookup
        if (session.customer) {
          await stripe.customers.update(session.customer, {
            metadata: {
              license_key: licenseKey,
              product: 'hu-generator-pro'
            }
          });
        }

        console.log(`License generated: ${licenseKey} for ${customerEmail}`);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      // Subscription cancelled/paused - license becomes invalid
      const subscription = event.data.object;
      console.log(`Subscription ended: ${subscription.id}, license revoked`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      console.log(`Payment failed for subscription: ${invoice.subscription}`);
      break;
    }
  }

  return res.status(200).json({ received: true });
};

// Disable body parsing so we get raw body for signature verification
module.exports.config = {
  api: {
    bodyParser: false
  }
};
