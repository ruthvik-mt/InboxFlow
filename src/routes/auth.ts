import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;
    const db = await getDB();

    // Check if user exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      name,
      createdAt: new Date(),
    });

    // Generate token
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[Auth] User registered:', email);

    //FIX: httpOnly
    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      token,
      user: {
        _id: result.insertedId.toString(),
        email,
        name,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const db = await getDB();

    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[Auth] User logged in:', email);

    // httpOnly
    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      token,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.userId) },
      { projection: { password: 0 } } // Don't send password
    );

    if (!user) {
      console.log('[Auth] User not found for ID:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[Auth] Token verified for user:', user.email);

    res.json({
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
    });
  } catch (err: any) {
    console.error('[Auth] Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  console.log('[Auth] User logged out');
  res.json({ message: 'Logged out successfully' });
});

export default router;