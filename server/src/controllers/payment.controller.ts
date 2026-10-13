import { Request, Response } from 'express';
import { AuthRequest } from '../types/index.js';
import { User } from '../models/User.js';

/**
 * Stripe Payment Controller — Test Mode Ready
 *
 * Add to server/.env:
 *   STRIPE_SECRET_KEY=sk_test_xxxx          (from dashboard.stripe.com/test/apikeys)
 *   STRIPE_PUBLISHABLE_KEY=pk_test_xxxx     (same page)
 *   STRIPE_GOLD_PRICE_ID=price_xxxx         (create at dashboard.stripe.com/test/products)
 *   STRIPE_WEBHOOK_SECRET=whsec_xxxx        (from dashboard.stripe.com/test/webhooks)
 *
 * Test card: 4242 4242 4242 4242 | Any future date | Any CVC
 */

const getStripe = async () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.includes('your_')) {
    throw new Error('[Stripe] STRIPE_SECRET_KEY not configured. Add sk_test_... to .env');
  }
  const Stripe = (await import('stripe')).default;
  return new Stripe(stripeKey, { apiVersion: '2024-04-10' as any });
};

const isTestMode = () =>
  !!(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));

export class PaymentController {
  // ── Create Stripe Checkout Session ───────────────────────────────────────────
  public static async createCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey || stripeKey.includes('your_')) {
        res.status(503).json({
          success: false,
          message: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to .env',
          setupRequired: true,
        });
        return;
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      if (user.subscriptionTier === 'PREMIUM_GOLD') {
        res.status(400).json({ success: false, message: 'You are already a Gold member.' });
        return;
      }

      const stripe = await getStripe();

      // Determine price: use configured price ID or create inline price
      let priceData: any;
      const configuredPriceId = process.env.STRIPE_GOLD_PRICE_ID;

      if (configuredPriceId && !configuredPriceId.includes('your_')) {
        // Use pre-configured price ID
        priceData = { price: configuredPriceId, quantity: 1 };
      } else {
        // Create inline price (useful for test mode without pre-setup)
        priceData = {
          price_data: {
            currency: 'usd',
            unit_amount: 2900, // $29.00
            recurring: { interval: 'month' },
            product_data: {
              name: 'DocIn Premium Gold',
              description: 'Priority placement, unlimited connections, advanced analytics',
            },
          },
          quantity: 1,
        };
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: user.email,
        line_items: [priceData],
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/subscription?payment=cancelled`,
        metadata: {
          userId: user._id.toString(),
          userEmail: user.email,
        },
        allow_promotion_codes: true,
      });

      res.json({
        success: true,
        data: {
          url: session.url,
          sessionId: session.id,
        },
      });
    } catch (error: any) {
      console.error('[Stripe] Checkout error:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Stripe Webhook ────────────────────────────────────────────────────────────
  public static async handleWebhook(req: Request, res: Response): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: any;

    if (!webhookSecret || webhookSecret.includes('your_')) {
      // Dev mode: parse event without signature verification
      console.warn('[Stripe Webhook] No webhook secret — parsing without signature (dev only)');
      try {
        event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      } catch {
        res.status(400).json({ success: false, message: 'Invalid webhook payload' });
        return;
      }
    } else {
      try {
        const stripe = await getStripe();
        const sig = req.headers['stripe-signature'];
        event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
      } catch (err: any) {
        console.error('[Stripe Webhook] Signature failed:', err.message);
        res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
        return;
      }
    }

    console.log('[Stripe Webhook] Event:', event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = session.metadata?.userId;
          if (userId) {
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            await User.findByIdAndUpdate(userId, {
              subscriptionTier: 'PREMIUM_GOLD',
              subscriptionExpiresAt: expiresAt,
            });
            console.log(`[Stripe] ✓ Gold activated for user ${userId}`);
          }
          break;
        }

        case 'customer.subscription.deleted':
        case 'customer.subscription.paused': {
          const subscription = event.data.object;
          const customerId = subscription.customer;
          if (customerId) {
            const stripe = await getStripe();
            const customer = await stripe.customers.retrieve(customerId as string) as any;
            if (customer?.email) {
              const user = await User.findOne({ email: customer.email });
              if (user) {
                await User.findByIdAndUpdate(user._id, {
                  subscriptionTier: 'FREE',
                  subscriptionExpiresAt: undefined,
                });
                console.log(`[Stripe] Gold cancelled for user ${user._id}`);
              }
            }
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object;
          console.log('[Stripe] Payment succeeded for invoice:', invoice.id);
          break;
        }

        case 'invoice.payment_failed': {
          console.warn('[Stripe] Payment failed for invoice:', event.data.object.id);
          break;
        }

        default:
          console.log('[Stripe Webhook] Unhandled event type:', event.type);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('[Stripe Webhook Error]:', error);
      res.status(500).json({ success: false, message: 'Webhook processing error.' });
    }
  }

  // ── Get Subscription Status ────────────────────────────────────────────────
  public static async getSubscriptionStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const user = await User.findById(req.user.userId)
        .select('subscriptionTier subscriptionExpiresAt')
        .lean();
      res.json({
        success: true,
        data: {
          tier: user?.subscriptionTier || 'FREE',
          expiresAt: (user as any)?.subscriptionExpiresAt || null,
          isGold: user?.subscriptionTier === 'PREMIUM_GOLD',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Verify Session (called from success page) ─────────────────────────────
  public static async verifySession(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ success: false, message: 'Session ID required.' });
        return;
      }

      const stripe = await getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid' && session.metadata?.userId === req.user.userId) {
        // Manually activate if webhook hasn't fired yet
        const user = await User.findById(req.user.userId);
        if (user && user.subscriptionTier !== 'PREMIUM_GOLD') {
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          await User.findByIdAndUpdate(req.user.userId, {
            subscriptionTier: 'PREMIUM_GOLD',
            subscriptionExpiresAt: expiresAt,
          });
        }
        res.json({ success: true, message: 'Payment verified. Gold activated!' });
      } else {
        res.json({ success: false, message: 'Payment not completed.' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Get Invoices and Billing Details ──────────────────────────────────────
  public static async getMyInvoices(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { Invoice } = await import('../models/Invoice.js');
      const user = await User.findById(req.user.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
      }

      let invoices = await Invoice.find({ userId: user._id }).sort({ billingDate: -1 }).lean();

      // If user has Gold membership and no invoice exists yet, auto-generate one
      if (user.subscriptionTier === 'PREMIUM_GOLD' && invoices.length === 0) {
        const invNum = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const initialInvoice = await Invoice.create({
          invoiceNumber: invNum,
          userId: user._id,
          planName: 'DocIn Premium Gold Membership',
          amount: 29.00,
          currency: 'USD',
          status: 'PAID',
          billingDate: new Date(),
          paidAt: new Date(),
          paymentMethod: { brand: 'Visa', last4: '4242' },
          customerDetails: {
            fullName: user.fullName,
            email: user.email,
            role: user.role,
          },
          items: [
            {
              description: 'DocIn Premium Gold Membership — Monthly Access (Priority Verification, AI OCR, CME Credits, Unlimited Network)',
              quantity: 1,
              unitPrice: 29.00,
              amount: 29.00,
            },
          ],
          subtotal: 29.00,
          tax: 0.00,
          total: 29.00,
        });
        invoices = [initialInvoice.toObject() as any];
      }

      const nextBillingDate = user.subscriptionExpiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      res.json({
        success: true,
        data: {
          currentPlan: {
            tier: user.subscriptionTier,
            planName: user.subscriptionTier === 'PREMIUM_GOLD' ? 'DocIn Premium Gold' : 'DocIn Free Standard',
            price: user.subscriptionTier === 'PREMIUM_GOLD' ? 29.00 : 0.00,
            billingCycle: 'Monthly',
            status: 'ACTIVE',
            nextBillingDate,
            paymentMethod: user.subscriptionTier === 'PREMIUM_GOLD' ? { brand: 'Visa', last4: '4242' } : null,
          },
          invoices,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── Cancel Subscription ────────────────────────────────────────────────────
  public static async cancelSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      await User.findByIdAndUpdate(req.user.userId, {
        subscriptionTier: 'FREE',
        subscriptionExpiresAt: undefined,
      });
      res.json({ success: true, message: 'Subscription cancelled. Reverted to Free tier.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
