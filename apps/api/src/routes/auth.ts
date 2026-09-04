import { Router, type Request, type Response, type IRouter } from 'express';
import { z } from 'zod';
import { User } from '../models/user.js';

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
    req.session.userId = String(user._id);
    res.status(201).json({ id: user._id, email: user.email });
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
    req.session.userId = String(user._id);
    res.json({ id: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/logout', (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

// Returns current session user — used by frontend on initial load
authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
      req.session.destroy(() => undefined);
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    res.json({ id: user._id, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
