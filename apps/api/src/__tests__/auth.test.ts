import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import session from 'express-session';

// Mock heavy dependencies — no real MongoDB needed
vi.mock('../models/user.js', () => ({
  User: { findOne: vi.fn(), findById: vi.fn() },
}));
vi.mock('../db.js', () => ({ connectDb: vi.fn() }));
vi.mock('connect-mongo', () => ({ default: { create: vi.fn() } }));

import { authRouter } from '../routes/auth.js';
import { User } from '../models/user.js';

const mockUser = {
  _id: 'user-123',
  email: 'test@example.com',
  save: vi.fn().mockResolvedValue(undefined),
  comparePassword: vi.fn(),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  app.use('/auth', authRouter);
  return app;
}

beforeEach(() => { vi.clearAllMocks(); });

describe('POST /auth/register', () => {
  it('rejects invalid email', async () => {
    const res = await request(buildApp()).post('/auth/register').send({ email: 'bad', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(buildApp()).post('/auth/register').send({ email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already registered', async () => {
    vi.mocked(User.findOne).mockResolvedValue(mockUser as never);
    const res = await request(buildApp()).post('/auth/register').send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login', () => {
  it('returns 401 for unknown email', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    const res = await request(buildApp()).post('/auth/login').send({ email: 'x@x.com', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    vi.mocked(User.findOne).mockResolvedValue({ ...mockUser, comparePassword: vi.fn().mockResolvedValue(false) } as never);
    const res = await request(buildApp()).post('/auth/login').send({ email: 'test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('same error message for wrong email vs wrong password (no enumeration)', async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    const r1 = await request(buildApp()).post('/auth/login').send({ email: 'x@x.com', password: 'password123' });
    vi.mocked(User.findOne).mockResolvedValue({ ...mockUser, comparePassword: vi.fn().mockResolvedValue(false) } as never);
    const r2 = await request(buildApp()).post('/auth/login').send({ email: 'test@example.com', password: 'wrong' });
    expect(r1.body.error).toBe(r2.body.error);
  });
});

describe('POST /auth/logout', () => {
  it('returns ok', async () => {
    const res = await request(buildApp()).post('/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('GET /auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await request(buildApp()).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
