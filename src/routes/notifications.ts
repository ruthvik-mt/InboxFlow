// src/routes/notifications.ts
import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDB } from '../config/database';
import { ObjectId } from 'mongodb';

const router = express.Router();

router.use(authenticateToken);

// Notification schema in MongoDB
interface Notification {
  _id?: ObjectId;
  userId: ObjectId;
  emailId: string;
  subject: string;
  from: string;
  category: string;
  account: string;
  timestamp: Date;
  slackSent: boolean;
  webhookSent: boolean;
  read: boolean;
}

// Get recent notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const notifications = await db
      .collection<Notification>('notifications')
      .find({ userId: new ObjectId(req.userId!) })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    const unreadCount = await db
      .collection<Notification>('notifications')
      .countDocuments({ userId: new ObjectId(req.userId!), read: false });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    await db.collection<Notification>('notifications').updateOne(
      { 
        _id: new ObjectId(req.params.id),
        userId: new ObjectId(req.userId!)
      },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark all as read
router.post('/read-all', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    await db.collection<Notification>('notifications').updateMany(
      { userId: new ObjectId(req.userId!) },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete notification
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDB();
    await db.collection<Notification>('notifications').deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.userId!)
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;