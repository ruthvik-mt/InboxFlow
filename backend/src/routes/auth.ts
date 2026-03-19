import logger from '../utils/logger';
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDB } from '../config/database';
import { body, validationResult } from 'express-validator';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendOTP } from '../services/emailService';

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

// Send OTP
router.post('/send-otp', [
  body('email').isEmail().withMessage('Invalid email'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const db = await getDB();

    // Store OTP with 10 min expiry
    await db.collection('verification_otps').updateOne(
      { email },
      { 
        $set: { 
          otp, 
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) 
        } 
      },
      { upsert: true }
    );

    await sendOTP(email, otp);

    res.json({ message: 'OTP sent successfully' });
  } catch (err: any) {
    logger.error('Send OTP error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Register
router.post('/register', [
  ...registerValidation,
  body('otp').notEmpty().withMessage('OTP is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, otp } = req.body;
    const db = await getDB();

    // Verify OTP
    const otpRecord = await db.collection('verification_otps').findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

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

    // Delete used OTP
    await db.collection('verification_otps').deleteOne({ email });

    logger.info('[Auth] User registered:', email);

    res.json({
      message: 'Registration successful. Please log in.',
      user: {
        _id: result.insertedId.toString(),
        email,
        name,
      },
    });
  } catch (err: any) {
    logger.error('Register error:', err);
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

    logger.info('[Auth] User logged in:', email);

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
    logger.error('Login error:', err);
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
      logger.info('[Auth] User not found for ID:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('[Auth] Token verified for user:', user.email);

    res.json({
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
    });
  } catch (err: any) {
    logger.error('[Auth] Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Delete account
router.delete('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = await getDB();
    const userObjectId = new ObjectId(userId);

    // 1. Delete notifications
    await db.collection('notifications').deleteMany({ userId: userObjectId });
    logger.info(`[Auth] Notifications deleted for user: ${userId}`);

    // 2. Find and delete emails from Elasticsearch for each email account
    const accounts = await db.collection('emailAccounts').find({ userId: userObjectId }).toArray();
    const { deleteEmailsByAccount } = require('../services/elasticService');

    for (const account of accounts) {
        if (account.email) {
            await deleteEmailsByAccount(account.email);
        }
    }
    logger.info(`[Auth] Emails deleted from Elasticsearch for user: ${userId}`);

    // 3. Delete email accounts
    await db.collection('emailAccounts').deleteMany({ userId: userObjectId });
    logger.info(`[Auth] Email accounts deleted for user: ${userId}`);

    // 4. Delete user
    const result = await db.collection('users').deleteOne({ _id: userObjectId });
    
    if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
    }
    logger.info(`[Auth] User deleted: ${userId}`);

    // 5. Clear cookie
    res.clearCookie('token', { path: '/' });

    res.json({ message: 'Account and all related data deleted successfully' });
  } catch (err: any) {
    logger.error('[Auth] Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  logger.info('[Auth] User logged out');
  res.json({ message: 'Logged out successfully' });
});

export default router;