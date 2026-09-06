import { Router, type Request, type Response, type IRouter } from 'express';
import { z } from 'zod';
import { User } from '../models/user.js';
import { requireAuth, signToken } from '../middleware/require-auth.js';

export const authRouter: IRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email or password (min 8 chars)' });
      return;
    }
    const { email, password } = parsed.data;
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const user = new User({ email, password });
    await user.save();
    const token = signToken(String(user._id));
    res.status(201).json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }
    const { email, password } = parsed.data;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const token = signToken(String(user._id));
    res.json({ token, user: { id: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/logout', (_req: Request, res: Response): void => {
  // JWT is stateless — client simply discards the token
  res.json({ ok: true });
});

// Returns current user from JWT — used by frontend on initial load
authRouter.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    res.json({ id: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
