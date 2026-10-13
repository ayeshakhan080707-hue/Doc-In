import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for auth endpoints (login, register, forgot-password)
 * Prevents brute-force attacks on medical credential system
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // relaxed in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this IP. Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: false,
});

/**
 * Tighter limiter for password reset — prevent token enumeration attacks
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 1 hour.',
  },
});

/**
 * General API rate limiter — prevents abuse on public endpoints
 */
export const generalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/api/health';
  },
});

/**
 * Credential upload limiter — prevent spam uploads
 */
export const credentialUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many credential uploads. Please wait before uploading again.',
  },
});
