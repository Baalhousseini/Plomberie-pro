# Configuration APIs GreenFlow

## Variables d'environnement à configurer sur Vercel

### Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE=+33XXXXXXXXX

### Stripe (Paiement en ligne)
STRIPE_SECRET_KEY=<votre_cle_secrete_stripe>
STRIPE_PUBLISHABLE_KEY=<votre_cle_publique_stripe>
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

## Comment configurer sur Vercel
1. Aller sur vercel.com → ton projet → Settings → Environment Variables
2. Ajouter chaque variable ci-dessus avec sa valeur
3. Redéployer (git push sur main suffit)

## Comptes à créer
- Twilio : twilio.com (gratuit pour tester)
- Stripe : stripe.com (0% frais jusqu'au 1er paiement)
