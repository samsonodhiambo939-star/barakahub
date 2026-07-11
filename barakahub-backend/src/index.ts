import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

import { prisma } from './utils/prisma';

// Root health check (for Render's default health check path)
app.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Debug: check database connection
app.get('/debug/db', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 as connected`;
    const userCount = await prisma.user.count();
    const users = await prisma.user.findMany({ select: { id: true, phone: true, firstName: true, role: true } });
    res.json({ database: 'connected', userCount, users });
  } catch (err: any) {
    res.status(500).json({ database: 'error', message: err.message, code: err.code });
  }
});

// Debug: test login endpoint (direct, no middleware)
app.post('/debug/login', async (req, res) => {
  try {
    const { authService } = await import('./services/auth.service');
    const result = await authService.login(req.body.phone, req.body.password);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    });
  }
});

// Security
const cspConnectSrc = ["'self'"];
if (config.appUrl) cspConnectSrc.push(config.appUrl);
if (config.apiUrl && config.apiUrl !== config.appUrl) cspConnectSrc.push(config.apiUrl);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: cspConnectSrc,
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
  origin: true,
  credentials: true,
}));

// Rate limiting — generous global limit; strict on auth
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later' },
});
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', limiter);

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1', routes);

// Error handler
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`${config.appName} API running on port ${config.port}`);
  });
}

export default app;
