import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, LogEntry } from './types';
import LandingPage from './components/LandingPage';
import AuthPages from './components/AuthPages';
import SecurityPortal from './components/SecurityPortal';
import AdminDashboard from './components/AdminDashboard';

// Helper to format current clock
function getFormattedTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

// Initial realistic cryptographic logs
const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    timestamp: '03:48:15',
    category: 'auth',
    message: 'User ethan.miller@secureauth.io successfully authenticated via password login from IP 192.168.1.104.',
    severity: 'info',
  },
  {
    id: 'log-2',
    timestamp: '03:36:20',
    category: 'threat',
    message: 'Multi-Factor Authentication (MFA) Verification failed for user janet.doe@gmail.com from IP 45.23.11.202: Invalid TOTP Token sequence.',
    severity: 'critical',
  },
  {
    id: 'log-3',
    timestamp: '03:08:12',
    category: 'crypto',
    message: 'User marcus.k@enterprise.org successfully executed a Password Reset from IP 88.120.44.11.',
    severity: 'info',
  },
  {
    id: 'log-4',
    timestamp: '02:50:45',
    category: 'auth',
    message: 'User robert.fox@secureauth.io successfully authenticated via password login from IP 10.0.4.22.',
    severity: 'info',
  },
  {
    id: 'log-5',
    timestamp: '01:52:10',
    category: 'auth',
    message: 'Biometric Authentication successfully completed for user amy.long@secureauth.io from IP 192.168.1.5.',
    severity: 'info',
  },
  {
    id: 'log-6',
    timestamp: '01:10:04',
    category: 'system',
    message: 'Core entropy pool seeded with 4096 bits of premium hardware atmospheric noise.',
    severity: 'info',
  },
  {
    id: 'log-7',
    timestamp: '00:30:19',
    category: 'crypto',
    message: 'Master hardware security modules (HSM) verified. Cryptographic keys securely loaded.',
    severity: 'info',
  },
  {
    id: 'log-8',
    timestamp: '00:15:32',
    category: 'threat',
    message: 'Egress threat detection gateway synchronized with latest vulnerability databases.',
    severity: 'info',
  }
];

const DEFAULT_USERS: User[] = [
  {
    email: 'm.kane@corporate.net',
    mfaSecret: 'KANE77MFAKEY7777',
    mfaEnabled: true,
    registeredAt: 'Oct 12, 2023',
    fullName: 'Marcus Kane',
    role: 'Admin',
    status: 'Active',
    password: 'AdminPass123!'
  },
  {
    email: 's.connor@cyberdyne.io',
    mfaSecret: 'CONNOR88MFAKEY8888',
    mfaEnabled: false,
    registeredAt: 'Nov 04, 2023',
    fullName: 'Sarah Connor',
    role: 'User',
    status: 'Inactive',
    password: 'AdminPass123!'
  },
  {
    email: 'd.ames@lifeextension.com',
    mfaSecret: 'AMES99MFAKEY9999',
    mfaEnabled: true,
    registeredAt: 'Jan 18, 2024',
    fullName: 'David Ames',
    role: 'User',
    status: 'Active',
    password: 'AdminPass123!'
  },
  {
    email: 'e.ripley@nostromo.fleet',
    mfaSecret: 'RIPLEY00MFAKEY0000',
    mfaEnabled: true,
    registeredAt: 'Feb 29, 2024',
    fullName: 'Ellen Ripley',
    role: 'Admin',
    status: 'Active',
    password: 'AdminPass123!'
  },
  {
    email: 'neo@thematrix.com',
    mfaSecret: 'NEO111MFAKEY1111',
    mfaEnabled: true,
    registeredAt: 'Mar 15, 2024',
    fullName: 'Thomas Neo',
    role: 'User',
    status: 'Active',
    password: 'AdminPass123!'
  }
];

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'register' | 'dashboard' | 'admin'>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  // Initialize users from client storage on first load
  useEffect(() => {
    const saved = localStorage.getItem('secureauth_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUsers(parsed);
        } else {
          setUsers(DEFAULT_USERS);
          localStorage.setItem('secureauth_users', JSON.stringify(DEFAULT_USERS));
        }
      } catch (e) {
        console.error('Failed to parse saved SecureAuth users', e);
        setUsers(DEFAULT_USERS);
      }
    } else {
      setUsers(DEFAULT_USERS);
      localStorage.setItem('secureauth_users', JSON.stringify(DEFAULT_USERS));
    }
  }, []);

  // Enforce Route Protection and Role-Based Redirects
  useEffect(() => {
    // If user is not logged in but tries to access protected views
    if (!currentUser) {
      if (view === 'dashboard' || view === 'admin') {
        setView('login');
      }
    } else {
      // User is logged in
      const userRole = currentUser.role || 'User';
      if (userRole === 'Admin') {
        // Admins should not access user dashboard; send them to 'admin'
        if (view === 'dashboard') {
          setView('admin');
        }
      } else {
        // Regular users should not access admin dashboard; send them to 'dashboard'
        if (view === 'admin') {
          setView('dashboard');
        }
      }
    }
  }, [view, currentUser]);

  // Helper to add custom security events
  const addLog = (
    category: 'auth' | 'system' | 'crypto' | 'threat', 
    message: string, 
    severity: 'info' | 'warning' | 'critical'
  ) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: getFormattedTime(),
      category,
      message,
      severity
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Route router view selector
  const renderView = () => {
    switch (view) {
      case 'landing':
        return (
          <LandingPage 
            onNavigate={(nextView) => setView(nextView)} 
          />
        );
      case 'login':
      case 'register':
        return (
          <AuthPages 
            onNavigate={(nextView) => setView(nextView)} 
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            users={users}
            setUsers={setUsers}
            addLog={addLog}
          />
        );
      case 'dashboard':
        return (
          <SecurityPortal 
            onNavigate={(nextView) => setView(nextView)}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            logs={logs}
            setLogs={setLogs}
            addLog={addLog}
          />
        );
      case 'admin':
        return (
          <AdminDashboard 
            onNavigate={(nextView) => setView(nextView)}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            users={users}
            setUsers={setUsers}
            logs={logs}
            setLogs={setLogs}
            addLog={addLog}
          />
        );
      default:
        return <LandingPage onNavigate={(nextView) => setView(nextView)} />;
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-white">
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="w-full min-h-screen"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
