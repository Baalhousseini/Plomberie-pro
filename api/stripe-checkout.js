const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { amount, clientNom, rdvId, description } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_demo') {
    return res.status(200).json({ url: null, demo: true, message: 'Configurez STRIPE_SECRET_KEY dans Vercel' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: description || 'Intervention GreenFlow Technologies',
            description: `Dossier #${rdvId || 'N/A'} — ${clientNom || 'Client'}`
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: (req.headers.origin || 'https://green-flow.net') + '/paiement-ok.html?session={CHECKOUT_SESSION_ID}&rdv=' + (rdvId || ''),
      cancel_url: req.headers.origin || 'https://green-flow.net',
      metadata: { rdvId: String(rdvId || ''), clientNom: String(clientNom || '') }
    });
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
