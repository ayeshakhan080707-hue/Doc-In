import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import apiRouter from './routes/index.js';
import { generalRateLimiter } from './middlewares/rateLimiter.js';

export const createApp = (): Express => {
  const app = express();

  // ── CORS ───────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // In production (Railway), frontend is served by same Express server
        // so origin will be same-origin or undefined for server-to-server
        const allowed = [
          process.env.CLIENT_URL,
          process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined,
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:5000',
        ].filter(Boolean) as string[];

        // Allow requests with no origin (server-to-server, curl, Postman, same-origin)
        if (!origin || allowed.includes(origin) || process.env.NODE_ENV !== 'production') {
          callback(null, true);
        } else {
          // In production, also allow Railway domains dynamically
          const isRailway = origin.endsWith('.railway.app') || origin.endsWith('.up.railway.app');
          if (isRailway) {
            callback(null, true);
          } else {
            callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Core Middleware ─────────────────────────────────────────────────────────
  app.use(cookieParser());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // ── General rate limiting on all /api routes ────────────────────────────────
  app.use('/api', generalRateLimiter);

  // ── Static file serving for uploaded credentials ───────────────────────────
  // Files are stored in /uploads/credentials/ on the server filesystem
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      // Prevent directory listing
      index: false,
      // Cache for 1 hour
      maxAge: '1h',
    })
  );

  // ── Health Check ───────────────────────────────────────────────────────────
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'DocIn Healthcare Platform API',
    });
  });

  // ── API Routes ─────────────────────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ── Serve React frontend (production) ──────────────────────────────────────
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir, { index: false }));

  // SPA fallback — all non-API routes serve index.html so React Router works
  app.get(/^(?!\/api).*$/, (_req: Request, res: Response) => {
    const indexPath = path.join(publicDir, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).json({ success: false, message: 'Resource not found.' });
      }
    });
  });

  // ── 404 Handler (API only — unreachable non-API routes handled above) ───────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Resource not found.' });
  });

  // ── Global Error Handler ───────────────────────────────────────────────────
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Don't leak internal error details in production
    const isDev = process.env.NODE_ENV !== 'production';
    console.error('[Unhandled Error]:', err);

    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
      ...(isDev && err.stack ? { stack: err.stack } : {}),
    });
  });

  return app;
};
