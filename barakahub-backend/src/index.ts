import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
  origin: config.appUrl,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use(limiter);

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
