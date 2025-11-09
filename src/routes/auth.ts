import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getDB } from '../config/database';
import { User } from '../models/User';
import { ObjectId } from 'mongodb';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register
router.post(
  '/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const db = await getDB();
      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await db.collection<User>('users').findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser: User = {
        email,
        password: hashedPassword,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<User>('users').insertOne(newUser);

      // Generate token
      const token = jwt.sign({ userId: result.insertedId.toString() }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        token,
        user: { _id: result.insertedId, email, name },
      });
    } catch (err: any) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const db = await getDB();
      const { email, password } = req.body;

      const user = await db.collection<User>('users').findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user._id!.toString() }, JWT_SECRET, {
        expiresIn: '7d',
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        token,
        user: { _id: user._id, email: user.email, name: user.name },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const db = await getDB();
    const user = await db.collection<User>('users').findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ _id: user._id, email: user.email, name: user.name });
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
});

export default router;