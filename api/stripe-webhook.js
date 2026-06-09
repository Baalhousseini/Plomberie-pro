const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (e) {
    return res.status(400).json({ error: 'Webhook signature invalide' });
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Paiement reçu:', session.metadata.clientNom, session.amount_total / 100, 'EUR');
    // Ici on pourrait notifier Firebase via Admin SDK
  }
  res.json({ received: true });
};
