export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: 'Admin' | 'User';
  accountStatus: 'Active' | 'Inactive';
  status?: 'Active' | 'Inactive';
  mfaSecret?: string;
  mfaEnabled?: boolean;
  registeredAt?: string;
  password?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'auth' | 'system' | 'crypto' | 'threat';
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface AuthResponse {
  message: string;
  userId?: number;
  otp?: string;
  sessionToken?: string;
  user?: User;
}

export type EncryptionAlgorithm = 'AES-256' | 'RSA-2048' | 'ChaCha20';
