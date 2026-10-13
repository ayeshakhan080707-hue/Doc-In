import { Router, raw } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

// Stripe webhook — raw body required for signature verification
router.post('/webhook', raw({ type: 'application/json' }), PaymentController.handleWebhook);

// User endpoints
router.post('/checkout', requireAuth, PaymentController.createCheckoutSession);
router.get('/status', requireAuth, PaymentController.getSubscriptionStatus);
router.get('/invoices', requireAuth, PaymentController.getMyInvoices);
router.get('/verify/:sessionId', requireAuth, PaymentController.verifySession);
router.post('/cancel', requireAuth, PaymentController.cancelSubscription);

export default router;
