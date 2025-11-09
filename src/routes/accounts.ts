import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { getDB } from '../config/database';
import { EmailAccount } from '../models/User';
import { encrypt, decrypt } from '../utils/encryption';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { ObjectId } from 'mongodb';
import { restartImapForUser } from '../services/imapManager';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// List user's email accounts
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    const accounts = await db
      .collection<EmailAccount>('emailAccounts')
      .find({ userId: new ObjectId(req.userId!) })
      .project({ password: 0 }) // Don't send passwords
      .toArray();

    res.json({ accounts });
  } catch (err) {
    console.error('List accounts error:', err);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Add new email account
router.post(
  '/',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
    body('imapHost').notEmpty(),
    body('imapPort').isInt({ min: 1, max: 65535 }),
    body('accountName').notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const db = await getDB();
      const { email, password, imapHost, imapPort, accountName } = req.body;

      // Check if account already exists for this user
      const existing = await db.collection<EmailAccount>('emailAccounts').findOne({
        userId: new ObjectId(req.userId!),
        email,
      });

      if (existing) {
        return res.status(400).json({ error: 'Account already added' });
      }

      const encryptedPassword = encrypt(password);

      const newAccount: EmailAccount = {
        userId: new ObjectId(req.userId!),
        email,
        password: encryptedPassword,
        imapHost,
        imapPort: Number(imapPort),
        accountName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection<EmailAccount>('emailAccounts').insertOne(newAccount);

      // Restart IMAP connections for this user
      await restartImapForUser(req.userId!);

      res.json({
        message: 'Account added successfully',
        accountId: result.insertedId,
      });
    } catch (err: any) {
      console.error('Add account error:', err);
      res.status(500).json({ error: 'Failed to add account' });
    }
  }
);

// Delete email account
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    const result = await db.collection<EmailAccount>('emailAccounts').deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.userId!),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Restart IMAP connections
    await restartImapForUser(req.userId!);

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Toggle account active status
router.patch('/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    const account = await db.collection<EmailAccount>('emailAccounts').findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.userId!),
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await db.collection<EmailAccount>('emailAccounts').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isActive: !account.isActive, updatedAt: new Date() } }
    );

    await restartImapForUser(req.userId!);

    res.json({ message: 'Account status updated' });
  } catch (err) {
    console.error('Toggle account error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

export default router;