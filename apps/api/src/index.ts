import 'dotenv/config';
import express, { type Express } from 'express';

const app: Express = express();
const PORT = process.env['PORT'] ?? 5000;

app.use(express.json());

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.info(`API server running on port ${PORT}`);
});

export default app;
