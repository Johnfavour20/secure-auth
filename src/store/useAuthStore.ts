import { create } from 'zustand';
import { User, LogEntry } from '../types';

interface AuthStore {
  currentUser: User | null;
  sessionToken: string | null;
  logs: LogEntry[];
  users: User[];
  setCurrentUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
  setLogs: (logs: LogEntry[] | ((prev: LogEntry[]) => LogEntry[])) => void;
  addLog: (category: 'auth' | 'system' | 'crypto' | 'threat', message: string, severity: 'info' | 'warning' | 'critical') => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  currentUser: null,
  sessionToken: null,
  logs: [],
  users: [],
  setCurrentUser: (user) => set({ currentUser: user }),
  setSessionToken: (token) => set({ sessionToken: token }),
  setUsers: (users) => set((state) => ({
    users: typeof users === 'function' ? (users as (prev: User[]) => User[])(state.users) : users,
  })),
  setLogs: (logs) => set((state) => ({
    logs: typeof logs === 'function' ? (logs as (prev: LogEntry[]) => LogEntry[])(state.logs) : logs,
  })),
  addLog: (category, message, severity) => set((state) => ({
    logs: [
      {
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date().toISOString(),
        category,
        message,
        severity,
      },
      ...state.logs,
    ],
  })),
}));

export default useAuthStore;
