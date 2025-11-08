export interface EmailAddress {
  address: string;
  name?: string;
}

export interface Email {
  _id: string;
  from: string | EmailAddress;
  to: string | EmailAddress | EmailAddress[];
  subject: string;
  body: string;
  date: string | Date;
  account: string;
  accountEmail?: string;
  folder: string;
  category: string;
  messageId?: string;
}

export interface EmailResponse {
  meta: {
    total: number;
    page?: number;
    size: number;
  };
  emails: Email[];
}

export interface StatsResponse {
  timestamp: string;
  cerebras: {
    queueLength: number;
    running: number;
    dynamicDelayMs: number;
    consecutiveRateLimits: number;
  };
}

export type Category =
  | 'Interested'
  | 'Meeting Booked'
  | 'Not Interested'
  | 'Spam'
  | 'Out of Office';

// Helper function to format email address
export const formatEmailAddress = (email: string | EmailAddress | EmailAddress[]): string => {
  if (typeof email === 'string') {
    return email;
  }
  
  if (Array.isArray(email)) {
    return email.map(e =>
      typeof e === 'string' ? e : (e.name ? `${e.name} <${e.address}>` : e.address)
    ).join(', ');
  }
  
  if (email && typeof email === 'object') {
    return email.name ? `${email.name} <${email.address}>` : email.address;
  }
  
  return '';
};