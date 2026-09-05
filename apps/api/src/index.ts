import 'dotenv/config';
import express, { type Express } from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import { connectDb } from './db.js';
import { authRouter } from './routes/auth.js';
import { kitRouter } from './routes/kits.js';
import { practiceRouter } from './routes/practice.js';

const app: Express = express();
const PORT = process.env['PORT'] ?? 5000;
const MONGODB_URI = process.env['MONGODB_URI'] ?? '';
const SESSION_SECRET = process.env['SESSION_SECRET'] ?? 'dev-secret-change-me';
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '500kb' }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: process.env['NODE_ENV'] !== 'test' ? MongoStore.create({ mongoUrl: MONGODB_URI }) : undefined,
    cookie: {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use('/auth', authRouter);
app.use('/kits', kitRouter);
app.use('/practice', practiceRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server only outside test environment
if (process.env['NODE_ENV'] !== 'test') {
  void connectDb(MONGODB_URI).then(() => {
    app.listen(PORT, () => {
      console.info(`API server running on port ${PORT}`);
    });
  });
}

export default app;
