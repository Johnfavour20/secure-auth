export interface User {
  email: string;
  mfaSecret: string;
  mfaEnabled: boolean;
  registeredAt: string;
  fullName?: string;
  role?: 'Admin' | 'User';
  status?: 'Active' | 'Inactive';
  password?: string;
}

export interface Session {
  id: string;
  device: string;
  os: string;
  ip: string;
  location: string;
  activeSince: string;
  isCurrent: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'auth' | 'system' | 'crypto' | 'threat';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export type EncryptionAlgorithm = 'AES-256' | 'RSA-2048' | 'ChaCha20';
