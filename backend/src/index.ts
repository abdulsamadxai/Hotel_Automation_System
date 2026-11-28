import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prisma } from './lib/prisma.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { authenticate, getJwtSecret } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { hotelsRouter } from './routes/hotels.js';
import { usersRouter } from './routes/users.js';
import { roomsRouter } from './routes/rooms.js';
import { guestsRouter } from './routes/guests.js';
import { bookingsRouter } from './routes/bookings.js';
import { invoicesRouter } from './routes/invoices.js';
import { housekeepingRouter } from './routes/housekeeping.js';
import { staffRouter } from './routes/staff.js';
import { expensesRouter } from './routes/expenses.js';
import { automationsRouter } from './routes/automations.js';
import { notificationsRouter } from './routes/notifications.js';
import { messagesRouter } from './routes/messages.js';
import { activityRouter } from './routes/activity.js';
import { settingsRouter } from './routes/settings.js';
import { dashboardRouter } from './routes/dashboard.js';

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  // CORS_ORIGIN is a comma-separated list. Default covers the Vite dev
  // server (5173), this repo's frontend dev server (8080, vite.config.ts)
  // and Vite preview (4173) so local dev works out of the box.
  const corsOrigins = (
    process.env.CORS_ORIGIN ??
    'http://localhost:5173,http://localhost:8080,http://localhost:4173'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin:
        corsOrigins.includes('*') || corsOrigins.length === 0
          ? true
          : corsOrigins,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // No auth: liveness probe for Render / load balancers.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Auth routes are public for login/signup; /me authenticates itself.
  app.use('/api/auth', authRouter);

  // Everything else under /api requires a JWT.
  app.use('/api/hotels', authenticate, hotelsRouter);
  app.use('/api/users', authenticate, usersRouter);
  app.use('/api/rooms', authenticate, roomsRouter);
  app.use('/api/guests', authenticate, guestsRouter);
  app.use('/api/bookings', authenticate, bookingsRouter);
  app.use('/api/invoices', authenticate, invoicesRouter);
  app.use('/api/housekeeping', authenticate, housekeepingRouter);
  app.use('/api/staff', authenticate, staffRouter);
  app.use('/api/expenses', authenticate, expensesRouter);
  app.use('/api/automations', authenticate, automationsRouter);
  app.use('/api/notifications', authenticate, notificationsRouter);
  app.use('/api/messages', authenticate, messagesRouter);
  app.use('/api/activity', authenticate, activityRouter);
  app.use('/api/settings', authenticate, settingsRouter);
  app.use('/api/dashboard', authenticate, dashboardRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const isMain =
  process.argv[1]?.endsWith('index.ts') ||
  process.argv[1]?.endsWith('index.js');

if (isMain) {
  // Fail loudly at boot when JWT_SECRET is missing or a placeholder.
  getJwtSecret();
  const port = Number(process.env.PORT ?? 3001);
  const app = createApp();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`[api] Hotel Automation API listening on port ${port}`);
  });
  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}
