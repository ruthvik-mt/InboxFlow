import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAccount {
  _id?: ObjectId;
  userId: ObjectId;
  email: string;
  password: string; // encrypted
  imapHost: string;
  imapPort: number;
  accountName: string;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}