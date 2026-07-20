import client from './client';
import { AuthResponse, User, LogEntry } from '../types';

export function registerUser(fullName: string, email: string, password: string) {
  return client.post<AuthResponse>('/register', { fullName, email, password });
}

export function loginUser(email: string, password: string) {
  return client.post<AuthResponse>('/login', { email, password });
}

export function verifyOtp(userId: number, otp: string) {
  return client.post<AuthResponse>('/verify-otp', { userId, otp });
}

export function resendOtp(userId: number) {
  return client.post<AuthResponse>('/resend-otp', { userId });
}

export function fetchCurrentUser() {
  return client.get<User>('/me');
}

export function fetchAdminUsers() {
  return client.get<{ users: User[] }>('/admin/users');
}

export function fetchAdminLogs() {
  return client.get<{ logs: LogEntry[] }>('/admin/logs');
}

export function forgotPassword(email: string) {
  return client.post<{ message: string }>('/forgot-password', { email });
}

export function resetPassword(email: string, token: string, password: string) {
  return client.post<{ message: string }>('/reset-password', { email, token, password });
}
