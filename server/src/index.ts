import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { MemoryQueue } from './matching/MemoryQueue';
import { setupSocketHandlers, cleanStaleSessions } from './socket/handler';
import adminRoutes from './admin/routes';
import uploadRoutes, { storage } from './upload/routes';
import authRoutes from './auth/routes';
import { cleanExpiredReconnectCodes } from './reconnect/reconnectService';
import { initDatabase } from './db/initDb';

async function bootstrap() {
  // Ensure database tables exist
  await initDatabase();

  const app = express();
  app.set('trust proxy', 1);
  const server = http.createServer(app);

  // Security & Parsing Middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://static.cloudflareinsights.com'],
          scriptSrcElem: ["'self'", "'unsafe-inline'", 'https://static.cloudflareinsights.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', 'https:', '*'],
          mediaSrc: ["'self'", 'data:', 'blob:', 'https:', '*'],
          connectSrc: ["'self'", 'https:', 'wss:', 'ws:', '*'],
        },
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  // Configure matched CORS origins for Express and Socket.IO
  const rawCorsOrigin = process.env.CORS_ORIGIN || config.corsOrigin || '*';
  let corsOriginSetting: boolean | string | string[] | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);

  if (!rawCorsOrigin || rawCorsOrigin === '*' || rawCorsOrigin === 'true') {
    corsOriginSetting = (_origin, callback) => callback(null, true);
  } else if (rawCorsOrigin.includes(',')) {
    corsOriginSetting = rawCorsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  } else {
    corsOriginSetting = rawCorsOrigin.trim();
  }

  app.use(
    cors({
      origin: corsOriginSetting,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: config.siteName,
      timestamp: new Date().toISOString(),
    });
  });

  // Media Static Storage Directory with CORS & Security Headers
  const uploadDir = storage.getUploadDir();
  app.use(
    '/uploads',
    (req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      next();
    },
    express.static(uploadDir)
  );

  // REST APIs
  app.use('/api', uploadRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  // Socket.IO Setup
  const io = new Server(server, {
    cors: {
      origin: corsOriginSetting,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 5000,
    pingInterval: 3000,
    maxHttpBufferSize: 1e6, // Strict 1MB cap to block payload flood attacks
  });

  // Matching Queue & Sockets
  const queue = new MemoryQueue();
  setupSocketHandlers(io, queue);

  // Serve built static web application if public/ exists
  const publicDir = path.resolve(__dirname, '../public');
  if (fs.existsSync(publicDir)) {
    app.use(
      express.static(publicDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      })
    );

    // Explicit dynamic SPA route fallbacks for rooms and invite links
    app.get('/rooms/:id', (req, res, next) => {
      const cleanId = String(req.params.id).replace(/[^a-zA-Z0-9_-]/g, '');
      const directTarget = path.join(publicDir, 'rooms', `${cleanId}.html`);
      if (cleanId && fs.existsSync(directTarget)) return res.sendFile(directTarget);
      const fallbackTarget = path.join(publicDir, 'rooms', 'gaming.html');
      if (fs.existsSync(fallbackTarget)) return res.sendFile(fallbackTarget);
      next();
    });

    app.get('/r/:code', (req, res, next) => {
      const cleanCode = String(req.params.code).replace(/[^a-zA-Z0-9_-]/g, '');
      const directTarget = path.join(publicDir, 'r', `${cleanCode}.html`);
      if (cleanCode && fs.existsSync(directTarget)) return res.sendFile(directTarget);
      const fallbackTarget = path.join(publicDir, 'r', 'welcome.html');
      if (fs.existsSync(fallbackTarget)) return res.sendFile(fallbackTarget);
      next();
    });

    app.get('*', (req, res) => {
      // Don't serve HTML fallback for missing static assets or API routes
      if (
        req.path.startsWith('/_next/') ||
        req.path.startsWith('/api/') ||
        req.path.startsWith('/uploads/') ||
        req.path.startsWith('/socket.io/') ||
        path.extname(req.path) !== ''
      ) {
        return res.status(404).json({ error: 'Not found' });
      }

      const cleanPath = req.path.replace(/^\//, '').replace(/\/$/, '');
      const directHtml = path.join(publicDir, `${cleanPath}.html`);
      const nestedHtml = path.join(publicDir, cleanPath, 'index.html');
      const fallbackHtml = path.join(publicDir, 'index.html');

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      if (cleanPath && fs.existsSync(directHtml)) {
        return res.sendFile(directHtml);
      }
      if (cleanPath && fs.existsSync(nestedHtml)) {
        return res.sendFile(nestedHtml);
      }
      return res.sendFile(fallbackHtml);
    });
    logger.info('Static web application mounted from public directory.');
  }

  // ── Automated Ephemeral Cleanup Job (Runs every 30 minutes) ──
  const runPeriodicCleanup = async () => {
    try {
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      await storage.cleanOlderThan(TWO_HOURS_MS);
      await cleanExpiredReconnectCodes();
      cleanStaleSessions(TWO_HOURS_MS);
    } catch (err) {
      logger.error('Error during scheduled periodic cleanup:', err);
    }
  };

  // Run initial cleanup after 5s, then every 30 minutes
  setTimeout(runPeriodicCleanup, 5000);
  setInterval(runPeriodicCleanup, 30 * 60 * 1000);

  const port = process.env.PORT || config.port;
  server.listen(Number(port), '0.0.0.0', () => {
    logger.info(`${config.siteName} Server running on port ${port} (0.0.0.0)`);
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error:', err);
});
