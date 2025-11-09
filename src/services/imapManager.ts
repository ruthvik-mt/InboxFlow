import { getDB } from '../config/database';
import { EmailAccount } from '../models/User';
import { ImapService } from './imapService';
import { ObjectId } from 'mongodb';

// Store active connections per user
const activeConnections = new Map<string, ImapService[]>();

export async function initializeImapForUser(userId: string) {
  const db = await getDB();
  const accounts = await db
    .collection<EmailAccount>('emailAccounts')
    .find({
      userId: new ObjectId(userId),
      isActive: true,
    })
    .toArray();

  const services: ImapService[] = [];

  for (const account of accounts) {
    try {
      const imapService = new ImapService(
        account.email,
        account.password,
        account.imapHost,
        account.imapPort,
        account.accountName,
        userId,
        account._id!.toString()
      );

      imapService.connectAndListen();
      services.push(imapService);

      console.log(`[IMAP Manager] Started connection for ${account.email}`);
    } catch (err) {
      console.error(`[IMAP Manager] Failed to start ${account.email}:`, err);
    }
  }

  activeConnections.set(userId, services);
  return services;
}

export async function restartImapForUser(userId: string) {
  // Disconnect existing connections
  const existing = activeConnections.get(userId);
  if (existing) {
    existing.forEach((service) => service.disconnect());
    activeConnections.delete(userId);
  }

  // Reinitialize
  await initializeImapForUser(userId);
}

export function getActiveConnectionsForUser(userId: string): ImapService[] {
  return activeConnections.get(userId) || [];
}

export async function initializeAllUsers() {
  const db = await getDB();
  const users = await db
    .collection('users')
    .find({})
    .project({ _id: 1 })
    .toArray();

  for (const user of users) {
    await initializeImapForUser(user._id.toString());
  }

  console.log(`[IMAP Manager] Initialized connections for ${users.length} users`);
}