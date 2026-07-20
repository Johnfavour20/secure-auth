import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Users, ShieldAlert, Settings, HelpCircle, LogOut, 
  Search, Bell, History, UserPlus, Activity, AlertTriangle, 
  Download, LogIn, Fingerprint, RotateCcw, CheckCircle2, ArrowRight,
  Shield, Play, Trash2, X, Eye, EyeOff, Check, AlertOctagon, Terminal,
  MoreVertical, Filter, Ban
} from 'lucide-react';
import { User, LogEntry } from '../types';
import useAuthStore from '../store/useAuthStore';
import { logoutUser } from '../api/auth';

const API_BASE_URL = 'http://localhost:5000/api';

interface AdminDashboardProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard' | 'admin') => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setSessionToken?: (token: string | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  refreshUsers: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  addLog: (category: 'auth' | 'system' | 'crypto' | 'threat', message: string, severity: 'info' | 'warning' | 'critical') => void;
}

// Initial realistic security actions that we can randomly generate
const SIMULATED_IPS = ['192.168.1.104', '45.23.11.202', '88.120.44.11', '10.0.4.22', '184.22.109.5', '201.44.12.98'];
const SIMULATED_EMAILS = [
  'ethan.miller@secureauth.io',
  'janet.doe@gmail.com',
  'marcus.k@enterprise.org',
  'robert.fox@secureauth.io',
  'clara.wood@secureauth.io',
  'admin@secureauth.io'
];
const SIMULATED_ACTIONS = [
  { action: 'Login Attempt', icon: LogIn, category: 'auth' as const },
  { action: 'MFA Verification', icon: Fingerprint, category: 'auth' as const },
  { action: 'Password Reset', icon: RotateCcw, category: 'crypto' as const },
  { action: 'Threat Blocked', icon: ShieldAlert, category: 'threat' as const },
  { action: 'System Backup', icon: Terminal, category: 'system' as const }
];

export default function AdminDashboard({
  onNavigate,
  currentUser,
  setCurrentUser,
  setSessionToken,
  users,
  setUsers,
  logs,
  setLogs,
  refreshUsers,
  refreshLogs,
  addLog
}: AdminDashboardProps) {
  // The real session token issued at login/OTP-verify — needed on every
  // admin request now that the backend actually checks it.
  const sessionToken = useAuthStore((state) => state.sessionToken);

  const authHeaders = (extra: Record<string, string> = {}) => ({
    ...extra,
    Authorization: `Bearer ${sessionToken ?? ''}`,
  });

  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'logs' | 'settings' | 'support'>('overview');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audit modal state
  const [auditProgress, setAuditProgress] = useState<number>(-1); // -1 means inactive
  const [auditStatus, setAuditStatus] = useState<string>('');
  const [auditSteps, setAuditSteps] = useState<string[]>([]);
  
  // Create user form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'Admin' | 'User'>('User');
  const [newStatus, setNewStatus] = useState<'Active' | 'Inactive'>('Active');
  const [newPassword, setNewPassword] = useState('');
  const [newMfaEnabled, setNewMfaEnabled] = useState(false);
  const [newUserError, setNewUserError] = useState('');
  const [adminRequestError, setAdminRequestError] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  // User Management tab states
  const [userSearchText, setUserSearchText] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<'All' | 'Admin' | 'User'>('All');
  const [userFilterStatus, setUserFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [userPage, setUserPage] = useState<number>(1);
  const [usersPerPage] = useState<number>(5);
  const [activeUserActionMenuId, setActiveUserActionMenuId] = useState<string | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  
  // Support ticket form state
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState('');

  // Settings states
  const [enforceMfa, setEnforceMfa] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('15 mins');
  const [ipWhitelist, setIpWhitelist] = useState(false);
  const [encryptionLevel, setEncryptionLevel] = useState<'AES-256' | 'AES-512' | 'Quantum-Grade'>('AES-256');

  // Dynamic Authentication Logs Tab State
  const [logFilterStatus, setLogFilterStatus] = useState<'All' | 'SUCCESS' | 'FAILED'>('All');
  const [logFilterType, setLogFilterType] = useState<string>('All');
  const [logSearchText, setLogSearchText] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<any>(null);
  const [quarantinedEmails, setQuarantinedEmails] = useState<string[]>([]);
  const [logPage, setLogPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(6);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isFilterLoading, setIsFilterLoading] = useState<boolean>(false);

  // Simulated metrics that dynamically evolve
  const [activeSessionsCount, setActiveSessionsCount] = useState(156);
  const [failedAttemptsCount, setFailedAttemptsCount] = useState(12);

  useEffect(() => {
    const failedCount = logs.filter((log) => log.severity === 'critical' || log.severity === 'warning').length;
    setFailedAttemptsCount(failedCount);
  }, [logs]);

  const runAdminRequest = async (requestFn: () => Promise<void>) => {
    setAdminRequestError('');
    setIsAdminLoading(true);
    try {
      await requestFn();
      await refreshUsers();
      await refreshLogs();
    } catch (error) {
      console.error(error);
      setAdminRequestError(error instanceof Error ? error.message : 'Admin request failed.');
    } finally {
      setIsAdminLoading(false);
    }
  };

  // Auto-simulate activities periodically to make dashboard alive
  useEffect(() => {
    const sessionTimer = setInterval(() => {
      // Sessions fluctuate between 150 and 165
      setActiveSessionsCount(prev => {
        const offset = Math.random() > 0.5 ? 1 : -1;
        const next = prev + offset;
        return next < 140 ? 140 : next > 180 ? 180 : next;
      });
    }, 5000);

    return () => clearInterval(sessionTimer);
  }, []);

  // Handler for custom event simulation
  const simulateRandomSecurityEvent = () => {
    const randomEmail = SIMULATED_EMAILS[Math.floor(Math.random() * SIMULATED_EMAILS.length)];
    const randomIp = SIMULATED_IPS[Math.floor(Math.random() * SIMULATED_IPS.length)];
    const randomAct = SIMULATED_ACTIONS[Math.floor(Math.random() * SIMULATED_ACTIONS.length)];
    const isSuccess = Math.random() > 0.3;
    const severity = isSuccess ? 'info' as const : (Math.random() > 0.5 ? 'warning' as const : 'critical' as const);
    
    const message = isSuccess 
      ? `Simulated: Secure ${randomAct.action} by ${randomEmail} on IP ${randomIp} verified with success.`
      : `Simulated: Failed ${randomAct.action} alert generated from IP ${randomIp} for user identity ${randomEmail}.`;

    if (!isSuccess) {
      setFailedAttemptsCount(prev => prev + 1);
    }

    addLog(randomAct.category, message, severity);
  };

  // Parser function to turn raw LogEntry into rich parsed structure
  const parseLog = (l: LogEntry, index: number) => {
    // Extract email
    const emailMatch = l.message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : SIMULATED_EMAILS[index % SIMULATED_EMAILS.length];

    // Extract IP
    const ipMatch = l.message.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    const ip = ipMatch ? ipMatch[0] : SIMULATED_IPS[index % SIMULATED_IPS.length];

    // Status
    const isFailed = l.severity === 'critical' || l.message.toLowerCase().includes('failed') || l.message.toLowerCase().includes('fail') || l.message.toLowerCase().includes('block') || l.message.toLowerCase().includes('warn') || l.message.toLowerCase().includes('error');
    const status: 'SUCCESS' | 'FAILED' = isFailed ? 'FAILED' : 'SUCCESS';

    // Activity
    let activity = 'System Event';
    const msg = l.message.toLowerCase();
    if (msg.includes('login') || msg.includes('sign-in') || msg.includes('signin')) {
      activity = 'Login Attempt';
    } else if (msg.includes('mfa') || msg.includes('totp') || msg.includes('multi-factor') || msg.includes('otp')) {
      activity = 'MFA Verification';
    } else if (msg.includes('reset') || msg.includes('password')) {
      activity = 'Password Reset';
    } else if (msg.includes('threat') || msg.includes('block') || msg.includes('attack') || msg.includes('anomalous') || msg.includes('quarantine')) {
      activity = 'Threat Blocked';
    } else if (msg.includes('backup') || msg.includes('storage')) {
      activity = 'System Backup';
    } else if (msg.includes('logout') || msg.includes('closed') || msg.includes('sign out')) {
      activity = 'Logout';
    } else if (msg.includes('biometric') || msg.includes('fingerprint') || msg.includes('faceid')) {
      activity = 'Biometric Auth';
    } else if (msg.includes('seed') || msg.includes('entropy') || msg.includes('calibrated') || msg.includes('hsm') || msg.includes('cryptographic')) {
      activity = 'Cryptographic Calibration';
    }

    return {
      id: l.id,
      email,
      ip,
      activity,
      status,
      timestamp: l.timestamp,
      message: l.message,
      severity: l.severity,
      category: l.category,
      raw: l
    };
  };

  const parsedLogs = logs.map((l, idx) => parseLog(l, idx));

  // Compute filtered logs
  const filteredAuthLogs = parsedLogs.filter(pl => {
    // Filter status
    if (logFilterStatus !== 'All' && pl.status !== logFilterStatus) return false;

    // Filter activity type
    if (logFilterType !== 'All') {
      const typeLower = logFilterType.toLowerCase();
      const activityLower = pl.activity.toLowerCase();
      if (typeLower === 'login' && !activityLower.includes('Login')) return false;
      if (typeLower === 'otp' && (!activityLower.includes('MFA') && !activityLower.includes('Verification') && !activityLower.includes('OTP') && !activityLower.includes('Biometric'))) return false;
      if (typeLower === 'logout' && !activityLower.includes('Logout')) return false;
      if (typeLower === 'system' && (activityLower.includes('Login') || activityLower.includes('MFA') || activityLower.includes('Logout') || activityLower.includes('Biometric'))) return false;
    }

    // Filter search user or IP
    if (logSearchText.trim() !== '') {
      const q = logSearchText.toLowerCase();
      const matchesEmail = pl.email.toLowerCase().includes(q);
      const matchesIp = pl.ip.toLowerCase().includes(q);
      const matchesMsg = pl.message.toLowerCase().includes(q);
      const matchesActivity = pl.activity.toLowerCase().includes(q);
      if (!matchesEmail && !matchesIp && !matchesMsg && !matchesActivity) return false;
    }

    return true;
  });

  // Paginate logs
  const totalLogsCount = filteredAuthLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalLogsCount / itemsPerPage));
  const paginatedLogs = filteredAuthLogs.slice((logPage - 1) * itemsPerPage, logPage * itemsPerPage);

  const handleApplyFilters = () => {
    setIsFilterLoading(true);
    setLogPage(1); // Reset page on filter apply
    setTimeout(() => {
      setIsFilterLoading(false);
    }, 400);
  };

  const toggleQuarantine = (email: string) => {
    if (quarantinedEmails.includes(email)) {
      setQuarantinedEmails(prev => prev.filter(e => e !== email));
      addLog('threat', `Enterprise identity quarantine lifted for user ${email}. Node re-activated.`, 'warning');
    } else {
      setQuarantinedEmails(prev => [...prev, email]);
      addLog('threat', `Enterprise identity QUARANTINED by administrator Alex Johnson: ${email}. Authentication events blocked.`, 'critical');
    }
    setOpenActionMenuId(null);
  };

  const markSessionSafe = (email: string, ip: string) => {
    addLog('auth', `Authentication node marked safe for identity ${email} at IP ${ip}. Security scoring restored.`, 'info');
    setOpenActionMenuId(null);
  };

  const downloadSingleLogJwt = (log: any) => {
    const jwtPayload = {
      iss: 'secureauth_admin',
      sub: log.email,
      ip: log.ip,
      activity: log.activity,
      status: log.status,
      timestamp: log.timestamp,
      hash: 'sha256-' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jwtPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `log_audit_jwt_${log.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLog('crypto', `Cryptographic audit token generated and downloaded for log ${log.id}.`, 'info');
    setOpenActionMenuId(null);
  };

  // Run the security audit sequence
  const startSecurityAudit = () => {
    setAuditProgress(0);
    setAuditSteps([]);
    setAuditStatus('Initializing Security Audit Modules...');
    
    const steps = [
      'Scanning local network nodes...',
      'Verifying cryptographic AES-256 key entropy...',
      'Analyzing multi-factor authentication dynamic secrets...',
      'Evaluating session token expiration headers...',
      'Validating system logs against recent IP blacklists...',
      'Generating comprehensive vulnerability summary...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setAuditSteps(prev => [...prev, steps[currentStep]]);
        setAuditProgress(Math.floor(((currentStep + 1) / steps.length) * 100));
        setAuditStatus(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        setAuditStatus('Audit completed successfully. All threat nodes secure.');
        addLog('system', 'Global Security Audit completed. Threat level 0.01% - operational health optimal.', 'info');
        setFailedAttemptsCount(0); // clear failed counter as we "fixed" nodes
        setTimeout(() => {
          setAuditProgress(-1);
          setAuditSteps([]);
        }, 3000);
      }
    }, 900);
  };

  // Add new user handler
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserError('');

    if (!newEmail.includes('@')) {
      setNewUserError('Please provide a valid enterprise email domain.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === newEmail.toLowerCase())) {
      setNewUserError('User identity is already registered under SecureAuth.');
      return;
    }

    if (newPassword.trim().length < 8) {
      setNewUserError('Please provide a password with at least 8 characters.');
      return;
    }

    await runAdminRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          email: newEmail,
          fullName: newFullName || newEmail.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          role: newRole,
          accountStatus: newStatus,
          password: newPassword,
          mfaEnabled: newMfaEnabled,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to create user.');
      }

      setUsers((prev) => [data.user, ...prev.filter((user) => user.email !== data.user.email)]);
      addLog('system', `Administrator created user profile: ${newEmail} (MFA: ${newMfaEnabled ? 'Enabled' : 'Disabled'}, Role: ${newRole}, Status: ${newStatus})`, 'info');

      setNewEmail('');
      setNewFullName('');
      setNewRole('User');
      setNewStatus('Active');
      setNewPassword('');
      setNewMfaEnabled(false);
      setShowCreateModal(false);
    });
  };

  // Toggle user MFA status directly in the administration console
  const toggleUserMfa = async (user: User) => {
    const nextState = !user.mfaEnabled;
    await runAdminRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.userId}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ mfaEnabled: nextState }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to update MFA policy.');
      }

      setUsers((prev) => prev.map((entry) => (entry.userId === user.userId ? data.user : entry)));
      addLog('auth', `MFA policy modified for user ${user.email}: ${nextState ? 'ENFORCED' : 'BYPASSED'}`, 'warning');
    });
  };

  // Toggle user account active status
  const toggleUserStatus = async (user: User) => {
    const currentStatus = user.status || user.accountStatus || 'Active';
    const nextStatus = currentStatus === 'Inactive' ? 'Active' : 'Inactive';
    await runAdminRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.userId}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ accountStatus: nextStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to update account status.');
      }

      setUsers((prev) => prev.map((entry) => (entry.userId === user.userId ? data.user : entry)));
      addLog('system', `User account status modified: ${user.email} is now ${nextStatus.toUpperCase()}`, 'warning');
    });
  };

  // Change user role
  const changeUserRole = async (user: User, role: 'Admin' | 'User') => {
    await runAdminRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.userId}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to update user role.');
      }

      setUsers((prev) => prev.map((entry) => (entry.userId === user.userId ? data.user : entry)));
      addLog('system', `Access level changed for user ${user.email}: ${role.toUpperCase()}`, 'info');
    });
    setActiveUserActionMenuId(null);
  };

  // Delete user profile
  const deleteUserProfile = async (user: User) => {
    await runAdminRequest(async () => {
      const response = await fetch(`${API_BASE_URL}/admin/users/${user.userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to delete user.');
      }

      setUsers((prev) => prev.filter((entry) => entry.userId !== user.userId));
      addLog('system', `User account permanently terminated by admin directive: ${user.email}`, 'critical');
    });
  };

  // Submit mock support request
  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject || !supportMessage) return;

    addLog('system', `New support ticket filed: "${supportSubject}". Admin team dispatched.`, 'info');
    setSupportSuccess('Your critical security request has been cataloged. Ref ID: TKT-' + Math.floor(Math.random() * 90000 + 10000));
    setSupportSubject('');
    setSupportMessage('');

    setTimeout(() => {
      setSupportSuccess('');
    }, 4000);
  };

  // Export logs to client filesystem
  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `secureauth_audit_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLog('system', `Administrator Alex Johnson exported ${logs.length} system audit logs.`, 'info');
  };

  // Filter logs or users depending on search
  const filteredLogs = logs.filter(l => 
    l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.severity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(u => {
    // 1. Search text (matches full name or email)
    if (userSearchText.trim() !== '') {
      const q = userSearchText.toLowerCase();
      const emailMatch = u.email.toLowerCase().includes(q);
      const nameMatch = u.fullName ? u.fullName.toLowerCase().includes(q) : false;
      if (!emailMatch && !nameMatch) return false;
    } else if (searchQuery.trim() !== '') {
      // Fallback to topbar search query
      const q = searchQuery.toLowerCase();
      const emailMatch = u.email.toLowerCase().includes(q);
      const nameMatch = u.fullName ? u.fullName.toLowerCase().includes(q) : false;
      if (!emailMatch && !nameMatch) return false;
    }

    // 2. Filter role
    if (userFilterRole !== 'All') {
      const uRole = u.role || 'User';
      if (uRole !== userFilterRole) return false;
    }

    // 3. Filter status
    if (userFilterStatus !== 'All') {
      const uStatus = u.status || 'Active';
      if (uStatus !== userFilterStatus) return false;
    }

    return true;
  });

  // Export users list as CSV
  const handleExportUsersCsv = () => {
    const headers = ['Full Name', 'Email Address', 'Role', 'Account Status', 'MFA Status', 'Registration Date'];
    const rows = filteredUsers.map(u => [
      u.fullName || u.email.split('@')[0],
      u.email,
      u.role || 'User',
      u.status || 'Active',
      u.mfaEnabled ? 'Enforced' : 'Bypassed',
      u.registeredAt
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `secureauth_users_directory_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addLog('system', `Administrator Alex Johnson exported ${filteredUsers.length} user directory records.`, 'info');
  };

  // Close the session server-side, then return to landing page
  const handleLogout = () => {
    void logoutUser().catch((requestError) => console.error('Logout request failed:', requestError));

    addLog('auth', `Administrator session closed. Admin console detached.`, 'info');
    setCurrentUser(null);
    setSessionToken?.(null);
    onNavigate('landing');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1A1C1E] font-sans flex antialiased select-none">
      
      {/* 1. SIDEBAR COMPONENT */}
      <aside className="w-64 bg-white border-r border-[#E2E2E6] flex flex-col h-screen fixed left-0 top-0 py-6 px-4 z-40">
        {/* Brand Header */}
        <div className="mb-8 px-3 pt-2">
          <h1 className="font-sans text-2xl font-bold text-[#1e40af] tracking-tight leading-none">SecureAuth</h1>
          <span className="text-[9px] font-bold tracking-[0.18em] text-slate-400 block mt-1.5 uppercase font-sans">
            ENTERPRISE SECURITY
          </span>
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1.5">
          <button 
            onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}
            className={`w-full relative flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all cursor-pointer group ${
              activeTab === 'overview' 
                ? 'text-[#1e40af] bg-[#F0F4F9] font-bold' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className={`w-4.5 h-4.5 ${activeTab === 'overview' ? 'text-[#1e40af]' : 'text-slate-500 group-hover:text-[#1e40af]'}`} />
              <span>Overview</span>
            </div>
            {activeTab === 'overview' && (
              <div className="absolute right-[-16px] top-1 bottom-1 w-1 bg-[#1e40af] rounded-l" />
            )}
          </button>
          
          <button 
            onClick={() => { setActiveTab('users'); setSearchQuery(''); }}
            className={`w-full relative flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all cursor-pointer group ${
              activeTab === 'users' 
                ? 'text-[#1e40af] bg-[#F0F4F9] font-bold' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-4.5 h-4.5 ${activeTab === 'users' ? 'text-[#1e40af]' : 'text-slate-500 group-hover:text-[#1e40af]'}`} />
              <span>User Management</span>
            </div>
            {activeTab === 'users' && (
              <div className="absolute right-[-16px] top-1 bottom-1 w-1 bg-[#1e40af] rounded-l" />
            )}
          </button>

          <button 
            onClick={() => { setActiveTab('logs'); setSearchQuery(''); }}
            className={`w-full relative flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-all cursor-pointer group ${
              activeTab === 'logs' 
                ? 'text-[#1e40af] bg-[#F0F4F9] font-bold' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <History className={`w-4.5 h-4.5 ${activeTab === 'logs' ? 'text-[#1e40af]' : 'text-slate-500 group-hover:text-[#1e40af]'}`} />
              <span>Authentication Logs</span>
            </div>
            {activeTab === 'logs' && (
              <div className="absolute right-[-16px] top-1 bottom-1 w-1 bg-[#1e40af] rounded-l" />
            )}
          </button>
        </nav>

        {/* Separator / Spacer */}
        <div className="flex-grow" />

        {/* Bottom Menu Items */}
        <div className="space-y-1.5 mb-4">
          <button 
            onClick={() => { setActiveTab('settings'); setSearchQuery(''); }}
            className={`w-full relative flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer group ${
              activeTab === 'settings' 
                ? 'text-[#1e40af] bg-[#F0F4F9]' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-[#1e40af]' : 'text-slate-400 group-hover:text-[#1e40af]'}`} />
              <span>Settings</span>
            </div>
            {activeTab === 'settings' && (
              <div className="absolute right-[-16px] top-1 bottom-1 w-1 bg-[#1e40af] rounded-l" />
            )}
          </button>

          <button 
            onClick={() => { setActiveTab('support'); setSearchQuery(''); }}
            className={`w-full relative flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer group ${
              activeTab === 'support' 
                ? 'text-[#1e40af] bg-[#F0F4F9]' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <HelpCircle className={`w-4 h-4 ${activeTab === 'support' ? 'text-[#1e40af]' : 'text-slate-400 group-hover:text-[#1e40af]'}`} />
              <span>Support</span>
            </div>
            {activeTab === 'support' && (
              <div className="absolute right-[-16px] top-1 bottom-1 w-1 bg-[#1e40af] rounded-l" />
            )}
          </button>

          <button 
            onClick={simulateRandomSecurityEvent}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg text-xs font-semibold text-amber-600 hover:bg-amber-50/50 transition-colors text-left cursor-pointer"
            title="Triggers random auth logs to verify real-time monitoring streams."
          >
            <Play className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <span>Simulate Log Event</span>
          </button>
        </div>

        {/* Identity & Portal Actions Footer */}
        <div className="border-t border-[#E2E2E6] pt-4 mt-auto">
          {/* Identity Block */}
          <div className="flex items-center gap-3 px-1 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#E5EFFD] text-[#1e40af] flex items-center justify-center font-bold text-xs border border-blue-100">
              AD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate leading-tight">Admin Root</span>
              <span className="text-[10px] text-slate-400 truncate font-mono mt-0.5">root@secureauth.io</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button 
              onClick={() => onNavigate('landing')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 text-center transition-colors cursor-pointer"
              title="Return to Public Site"
            >
              Public Site
            </button>
            <button 
              onClick={handleLogout}
              className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-[#ba1a1a] text-[10px] font-bold rounded-lg border border-rose-100 text-center transition-colors cursor-pointer"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex-grow ml-64 min-h-screen bg-[#F8FAFC]">
        
        {/* 3. TOP APP BAR */}
        <header className="h-16 border-b border-[#E2E2E6] bg-white sticky top-0 z-30 flex items-center justify-between px-8">
          <div>
            <h2 className="font-sans text-xl font-bold text-[#001D3D] leading-tight">
              {activeTab === 'overview' && 'Admin Overview'}
              {activeTab === 'users' && 'Manage Users'}
              {activeTab === 'logs' && 'Authentication Logs'}
              {activeTab === 'settings' && 'System Settings'}
              {activeTab === 'support' && 'Help & Support'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Filter Input for global tabs, except User Management which has its own */}
            {activeTab !== 'users' && (
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Global security search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-9 w-64 text-xs bg-slate-50 border border-slate-200 rounded-full outline-none focus:bg-white focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Icons row */}
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <button 
                onClick={simulateRandomSecurityEvent}
                title="Trigger simulated security event"
                className="p-1.5 text-slate-500 hover:text-[#1e40af] hover:bg-slate-50 rounded-full transition-colors relative cursor-pointer"
              >
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>

              {/* Settings gear icon */}
              <button 
                onClick={() => setActiveTab('settings')}
                title="System Settings"
                className="p-1.5 text-slate-500 hover:text-[#1e40af] hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              >
                <Settings className="w-5 h-5 text-slate-600" />
              </button>

              {/* Add User Button (Exclusive to User Management tab as shown in mockup) */}
              {activeTab === 'users' && (
                <button 
                  onClick={() => { setShowCreateModal(true); setNewUserError(''); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 h-10 rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ml-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add User</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 4. CONTENT VIEW SWITCHER */}
        <div className="p-8 max-w-7xl mx-auto space-y-6">
          {adminRequestError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {adminRequestError}
            </div>
          )}
          
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* METRICS ROW MATCHING THE SPEC */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Users Metric Card */}
                  <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl relative overflow-hidden group shadow-sm hover:shadow transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <Users className="text-primary w-8 h-8" />
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/80">
                        Total System Users
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registered Logins</p>
                    <h3 className="text-4xl font-black text-[#001D3D]">
                      {(1284 + users.length).toLocaleString()}
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-2">
                      <span>+12% month-over-month</span>
                    </p>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  </div>

                  {/* Active Sessions Metric Card */}
                  <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl relative overflow-hidden group shadow-sm hover:shadow transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <Activity className="text-[#006a60] w-8 h-8" />
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-full">
                        <div className="h-2 w-2 bg-[#006a60] rounded-full animate-pulse"></div>
                        <span className="text-[11px] font-bold text-[#006a60]">Live Engine</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Sessions</p>
                    <h3 className="text-4xl font-black text-[#001D3D]">
                      {activeSessionsCount}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Authorized enterprise tokens verified
                    </p>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[#006a60] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  </div>

                  {/* Failed Attempts Metric Card */}
                  <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl relative overflow-hidden group shadow-sm hover:shadow transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <AlertTriangle className="text-[#ba1a1a] w-8 h-8" />
                      <span className="text-[11px] font-bold text-[#ba1a1a] px-2.5 py-1 bg-red-50 rounded-full border border-red-100">
                        Critical Status
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Failed Attempts (24h)</p>
                    <h3 className={`text-4xl font-black ${failedAttemptsCount > 0 ? 'text-[#ba1a1a]' : 'text-[#006a60]'}`}>
                      {failedAttemptsCount}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Anomalous sign-ins quarantined
                    </p>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-[#ba1a1a] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  </div>
                </section>

                {/* TABLE AREA OF RECENT AUTHENTICATION ACTIVITY */}
                <section className="bg-white border border-[#E2E2E6] rounded-xl overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-[#E2E2E6] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                    <div>
                      <h3 className="font-headline text-lg font-bold text-[#001D3D]">Recent Authentication Activity</h3>
                      <p className="text-xs text-slate-500 mt-1">Real-time monitoring of identity verification across enterprise modules.</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleExportLogs}
                        className="flex items-center gap-2 bg-primary hover:bg-[#004395] text-white text-xs font-bold px-4 h-9 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Logs</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[#E2E2E6]">
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Identity</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action Type</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Security Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E2E6]">
                        
                        {/* Interactive dynamic user actions matching log history */}
                        {filteredLogs.slice(0, 5).map((l, index) => {
                          const scoreWidths = ['95%', '12%', '80%', '98%', '85%', '90%'];
                          const scoreWidth = scoreWidths[index % scoreWidths.length];
                          
                          // Categorize label
                          const isSuccess = l.severity !== 'critical';
                          const categoryName = l.category === 'auth' ? 'Login Attempt' : l.category === 'crypto' ? 'Key Reset' : l.category === 'threat' ? 'Threat Defense' : 'System Logic';
                          
                          // Determine dynamic initials
                          const parts = l.message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+)/);
                          const targetEmail = parts ? parts[0] : (SIMULATED_EMAILS[index % SIMULATED_EMAILS.length]);
                          const initials = targetEmail.split('@')[0].substring(0, 2).toUpperCase();

                          return (
                            <tr key={l.id} className="hover:bg-slate-50/60 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                                    l.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-primary/10 text-primary'
                                  }`}>
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-[#001D3D]">{targetEmail}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">IP: {SIMULATED_IPS[index % SIMULATED_IPS.length]}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#001D3D]">
                                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{categoryName}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border uppercase ${
                                  isSuccess 
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                    : 'bg-red-50 border-red-200 text-[#ba1a1a]'
                                }`}>
                                  {isSuccess ? 'SUCCESS' : 'FAILED'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-500">
                                {l.timestamp} (today)
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        l.severity === 'critical' ? 'bg-red-500' : l.severity === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: scoreWidth }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-500">{scoreWidth}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {/* Static Row 1 as Fallback */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-teal-100 text-[#006a60] rounded-full flex items-center justify-center font-bold text-xs">
                                EM
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#001D3D]">ethan.miller@secureauth.io</p>
                                <p className="text-[10px] text-slate-400 font-mono">IP: 192.168.1.104</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#001D3D]">
                              <LogIn className="w-3.5 h-3.5 text-[#006a60]" />
                              <span>Login Attempt</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 uppercase">
                              SUCCESS
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            2 mins ago
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '95%' }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">95%</span>
                            </div>
                          </td>
                        </tr>

                        {/* Static Row 2 as Fallback */}
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-xs">
                                JD
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[#001D3D]">janet.doe@gmail.com</p>
                                <p className="text-[10px] text-slate-400 font-mono">IP: 45.23.11.202</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#001D3D]">
                              <Fingerprint className="w-3.5 h-3.5 text-red-500" />
                              <span>MFA Verification</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 border border-red-200 text-[#ba1a1a] uppercase">
                              FAILED
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">
                            14 mins ago
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="bg-red-500 h-full rounded-full" style={{ width: '12%' }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">12%</span>
                            </div>
                          </td>
                        </tr>

                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-[#E2E2E6] flex justify-center">
                    <button 
                      onClick={() => setActiveTab('logs')}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer"
                    >
                      View All Security Logs
                    </button>
                  </div>
                </section>

                {/* BOTTOM CONTEXTUAL GRID */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* System Health Monitor */}
                  <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl shadow-sm space-y-4">
                    <h4 className="font-headline text-sm font-bold text-[#001D3D] uppercase tracking-wide">System Health Monitor</h4>
                    
                    <div className="space-y-4 pt-2">
                      {/* Stat 1 */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-600">
                          <span>Auth API Response</span>
                          <span className="font-mono text-emerald-600 font-bold">24ms (Optimal)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      {/* Stat 2 */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-600">
                          <span>Database Sync Status</span>
                          <span className="font-mono text-emerald-600 font-bold">100% (Synchronized)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#006a60] h-full rounded-full transition-all duration-1000" style={{ width: '100%' }}></div>
                        </div>
                      </div>

                      {/* Stat 3 */}
                      <div>
                        <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-600">
                          <span>Global Latency</span>
                          <span className="font-mono text-amber-600 font-bold">85ms (Elevated load)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: '70%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Audit Action */}
                  <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="space-y-2">
                      <h4 className="font-headline text-sm font-bold text-[#001D3D] uppercase tracking-wide">Security Audit Tool</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Execute a comprehensive diagnostic scan across all active enterprise authentication nodes to audit key storage and quarantine anomalous IP addresses.
                      </p>
                    </div>

                    <div className="pt-6">
                      {auditProgress === -1 ? (
                        <button 
                          onClick={startSecurityAudit}
                          className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-bold text-xs rounded-lg transition-all shadow hover:shadow-md active:translate-y-px flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4 text-emerald-400" />
                          <span>Launch Security Audit Scan</span>
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-mono font-bold text-primary animate-pulse">{auditStatus}</span>
                            <span className="font-mono text-slate-500">{auditProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${auditProgress}%` }}></div>
                          </div>
                          
                          {/* Minimal Console output inside audit */}
                          <div className="bg-slate-900 rounded p-2.5 font-mono text-[9px] text-emerald-400 h-16 overflow-y-auto space-y-0.5">
                            {auditSteps.map((s, idx) => (
                              <div key={idx} className="flex gap-1.5">
                                <span className="text-slate-500">&gt;</span>
                                <span>{s}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </section>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div 
                key="users-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Filters Header bar matching mockup */}
                <div className="bg-white p-5 rounded-xl border border-[#E2E2E6] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  {/* Search Input */}
                  <div className="relative flex-grow max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text"
                      placeholder="Search by name or email"
                      value={userSearchText}
                      onChange={(e) => {
                        setUserSearchText(e.target.value);
                        setUserPage(1);
                      }}
                      className="w-full pl-10 pr-4 h-10 bg-[#f8fafc] border border-slate-200 rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Filter actions */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                      className={`h-10 px-4 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        showFiltersPanel || userFilterRole !== 'All' || userFilterStatus !== 'All'
                          ? 'bg-blue-50 border-blue-200 text-blue-700' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filters</span>
                    </button>

                    <button 
                      onClick={handleExportUsersCsv}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-4 h-10 rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Filter Panel */}
                {showFiltersPanel && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white p-5 rounded-xl border border-[#E2E2E6] shadow-inner grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {/* Filter Role */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">System Role</label>
                      <select 
                        value={userFilterRole}
                        onChange={(e) => {
                          setUserFilterRole(e.target.value as any);
                          setUserPage(1);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none h-10 transition-all cursor-pointer font-medium text-slate-700"
                      >
                        <option value="All">All Roles</option>
                        <option value="Admin">Admin</option>
                        <option value="User">User</option>
                      </select>
                    </div>

                    {/* Filter Status */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Account Status</label>
                      <select 
                        value={userFilterStatus}
                        onChange={(e) => {
                          setUserFilterStatus(e.target.value as any);
                          setUserPage(1);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none h-10 transition-all cursor-pointer font-medium text-slate-700"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Reset Filters button */}
                    {(userFilterRole !== 'All' || userFilterStatus !== 'All' || userSearchText) && (
                      <div className="sm:col-span-2 flex justify-end">
                        <button 
                          onClick={() => {
                            setUserSearchText('');
                            setUserFilterRole('All');
                            setUserFilterStatus('All');
                            setUserPage(1);
                          }}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Users List Grid Table */}
                <div className="bg-white border border-[#E2E2E6] rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-[#E2E2E6]">
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Account Status</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Joined</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E2E6]">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">
                              No registered identity records match your query.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage).map((u) => {
                            const isCurrentAdmin = u.email === currentUser?.email;
                            const uRole = u.role || 'User';
                            const uStatus = u.status || 'Active';
                            
                            // Generate smart avatar initials
                            const nameToUse = u.fullName || u.email.split('@')[0];
                            const initials = nameToUse.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                            
                            // Mockup color pairings for avatars
                            const getAvatarStyle = (userInitials: string) => {
                              switch (userInitials) {
                                case 'MK':
                                  return 'bg-[#E5EFFD] text-blue-600 border-blue-100';
                                case 'SC':
                                  return 'bg-[#E2F7F2] text-teal-600 border-teal-100';
                                case 'DA':
                                  return 'bg-[#FFF3E6] text-amber-600 border-amber-100';
                                case 'ER':
                                  return 'bg-[#EEECFC] text-indigo-600 border-indigo-100';
                                case 'TN':
                                  return 'bg-[#F1F3F5] text-slate-600 border-slate-200';
                                default:
                                  return 'bg-blue-50 text-blue-600 border-blue-100';
                              }
                            };
                            
                            const avatarColor = getAvatarStyle(initials);

                            return (
                              <tr key={u.email} className="hover:bg-slate-50/40 transition-colors">
                                {/* Full Name */}
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border ${avatarColor}`}>
                                      {initials}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm text-slate-800 leading-normal">{nameToUse}</span>
                                      {isCurrentAdmin && (
                                        <span className="w-fit text-[8px] font-bold bg-blue-50 text-blue-600 px-1 py-0.5 rounded border border-blue-200 mt-0.5 uppercase tracking-wide">You</span>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Email */}
                                <td className="px-6 py-5 text-sm text-slate-600 font-mono">
                                  {u.email}
                                </td>

                                {/* Role */}
                                <td className="px-6 py-5">
                                  <span className={`px-2 py-0.5 border text-[10px] font-bold rounded tracking-wide uppercase ${
                                    uRole === 'Admin'
                                      ? 'bg-blue-50 border-blue-100 text-blue-600'
                                      : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}>
                                    {uRole}
                                  </span>
                                </td>

                                {/* Account Status */}
                                <td className="px-6 py-5">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                    uStatus === 'Active'
                                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
                                      : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${uStatus === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                    {uStatus}
                                  </span>
                                </td>

                                {/* Date Joined */}
                                <td className="px-6 py-5 text-xs font-medium text-slate-500">
                                  {u.registeredAt || 'Oct 12, 2023'}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-5 text-right relative">
                                  <div className="flex items-center justify-end gap-3">
                                    {/* Quick Toggle Status */}
                                    <button 
                                      onClick={() => void toggleUserStatus(u)}
                                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                                        uStatus === 'Active' 
                                          ? 'border-rose-200 text-rose-600 hover:bg-rose-50' 
                                          : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                                      }`}
                                    >
                                      {uStatus === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>

                                    {/* Menu trigger */}
                                    <button
                                      onClick={() => setActiveUserActionMenuId(activeUserActionMenuId === u.email ? null : u.email)}
                                      className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {/* Custom overlay menu */}
                                    <AnimatePresence>
                                      {activeUserActionMenuId === u.email && (
                                        <>
                                          <div className="fixed inset-0 z-45" onClick={() => setActiveUserActionMenuId(null)} />
                                          <motion.div 
                                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                            className="absolute right-6 top-10 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-left"
                                          >
                                            <div className="px-3 py-1.5 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                              Policy Controls
                                            </div>
                                            <button 
                                              onClick={() => void changeUserRole(u, uRole === 'Admin' ? 'User' : 'Admin')}
                                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer font-semibold"
                                            >
                                              <Shield className="w-3.5 h-3.5 text-indigo-500" />
                                              <span>{uRole === 'Admin' ? 'Demote to User' : 'Promote to Admin'}</span>
                                            </button>
                                            <button 
                                              onClick={() => {
                                                void toggleUserMfa(u);
                                                setActiveUserActionMenuId(null);
                                              }}
                                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer font-semibold"
                                            >
                                              <Fingerprint className="w-3.5 h-3.5 text-teal-500" />
                                              <span>{u.mfaEnabled ? 'Bypass MFA Policy' : 'Enforce MFA Policy'}</span>
                                            </button>
                                            <button 
                                              onClick={() => {
                                                addLog('crypto', `Simulated administrative password reset token dispatched to user email: ${u.email}`, 'info');
                                                setActiveUserActionMenuId(null);
                                              }}
                                              className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer font-semibold"
                                            >
                                              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                                              <span>Reset Password</span>
                                            </button>
                                            <button 
                                              onClick={() => {
                                                void deleteUserProfile(u);
                                                setActiveUserActionMenuId(null);
                                              }}
                                              className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-[#ba1a1a] text-xs flex items-center gap-2 cursor-pointer font-bold border-t border-slate-100"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-[#ba1a1a]" />
                                              <span>Terminate Profile</span>
                                            </button>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Dynamic Pagination Footer */}
                  {filteredUsers.length > 0 && (
                    <div className="px-6 py-4 border-t border-[#E2E2E6] bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-slate-500 text-xs">
                        Showing <span className="font-semibold text-slate-700">{(userPage - 1) * usersPerPage + 1}</span>-
                        <span className="font-semibold text-slate-700">
                          {Math.min(userPage * usersPerPage, filteredUsers.length)}
                        </span>{' '}
                        of <span className="font-semibold text-slate-700">{filteredUsers.length}</span> users
                      </p>

                      <div className="flex items-center gap-1.5">
                        <button 
                          disabled={userPage === 1}
                          onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          Previous
                        </button>

                        {Array.from({ length: Math.ceil(filteredUsers.length / usersPerPage) }).map((_, idx) => {
                          const p = idx + 1;
                          return (
                            <button
                              key={p}
                              onClick={() => setUserPage(p)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                userPage === p
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}

                        <button 
                          disabled={userPage === Math.ceil(filteredUsers.length / usersPerPage)}
                          onClick={() => setUserPage(prev => Math.min(Math.ceil(filteredUsers.length / usersPerPage), prev + 1))}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div 
                key="logs-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Header info */}
                <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-headline text-lg font-bold text-[#001D3D]">Authentication Logs</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Audit and monitor all identity verification events across the system. Real-time tracking of security-critical actions and login attempts.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={handleExportLogs}
                      className="bg-primary hover:bg-[#004395] text-white text-xs font-bold px-4 h-10 rounded-lg flex items-center gap-1.5 transition-all shadow active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export Logs JSON</span>
                    </button>
                    <button 
                      onClick={() => {
                        void runAdminRequest(async () => {
                          const response = await fetch(`${API_BASE_URL}/admin/logs`, {
                            method: 'DELETE',
                            headers: authHeaders(),
                            credentials: 'include',
                          });
                          const data = await response.json();
                          if (!response.ok) {
                            throw new Error(data.error ?? 'Unable to clear authentication logs.');
                          }
                          setLogs([]);
                          addLog('system', 'Security log history cleared by administrator request.', 'warning');
                        });
                      }}
                      className="border border-[#ba1a1a] text-[#ba1a1a] hover:bg-red-50 text-xs font-bold px-4 h-10 rounded-lg transition-all active:scale-95 cursor-pointer"
                    >
                      Clear Log History
                    </button>
                  </div>
                </div>

                {/* Filter Row */}
                <div className="bg-slate-50 p-6 rounded-xl border border-[#E2E2E6] flex flex-wrap items-center gap-4 shadow-sm">
                  <div className="flex flex-col gap-1 min-w-[140px] flex-1 sm:flex-none">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Status</label>
                    <select 
                      value={logFilterStatus}
                      onChange={(e) => {
                        setLogFilterStatus(e.target.value as any);
                        setLogPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary h-9 outline-none"
                    >
                      <option value="All">All</option>
                      <option value="SUCCESS">Success</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 min-w-[180px] flex-1 sm:flex-none">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Activity Type</label>
                    <select 
                      value={logFilterType}
                      onChange={(e) => {
                        setLogFilterType(e.target.value);
                        setLogPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded px-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary h-9 outline-none"
                    >
                      <option value="All">All Types</option>
                      <option value="Login">Login Attempt</option>
                      <option value="OTP">OTP / MFA / Biometric</option>
                      <option value="Logout">Logout</option>
                      <option value="System">System Infrastructure</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Search User or IP</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">person_search</span>
                      <input 
                        type="text"
                        placeholder="Search by user email, IP address, message..."
                        value={logSearchText}
                        onChange={(e) => {
                          setLogSearchText(e.target.value);
                          setLogPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded text-xs focus:border-primary focus:ring-1 focus:ring-primary h-9 outline-none"
                      />
                    </div>
                  </div>

                  <div className="self-end pb-0.5">
                    <button 
                      onClick={handleApplyFilters}
                      disabled={isFilterLoading}
                      className="bg-primary text-white px-5 h-9 rounded font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-70 cursor-pointer shadow-sm"
                    >
                      <Filter className={`w-3.5 h-3.5 ${isFilterLoading ? 'animate-spin' : ''}`} />
                      <span>{isFilterLoading ? 'Applying...' : 'Apply Filters'}</span>
                    </button>
                  </div>
                </div>

                {/* Interactive Data Table Area */}
                <div className="bg-white border border-[#E2E2E6] rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-[#E2E2E6]">
                        <tr>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Activity</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">IP Address</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                          <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E2E6]">
                        {isFilterLoading ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-24 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-slate-400 font-medium">Re-indexing logs trail database...</p>
                              </div>
                            </td>
                          </tr>
                        ) : paginatedLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-xs">
                              No operational authentication logs match your active filter criteria. Try injecting random simulator events.
                            </td>
                          </tr>
                        ) : (
                          paginatedLogs.map((l, idx) => {
                            const isQuarantined = quarantinedEmails.includes(l.email);
                            const initials = l.email.substring(0, 2).toUpperCase();
                            
                            // Color maps for dynamic visual variety
                            const colorPairs = [
                              { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' },
                              { bg: 'bg-teal-50 text-teal-700 border-teal-100', dot: 'bg-teal-500' },
                              { bg: 'bg-orange-50 text-orange-700 border-orange-100', dot: 'bg-orange-500' },
                              { bg: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' },
                              { bg: 'bg-sky-50 text-sky-700 border-sky-100', dot: 'bg-sky-500' },
                            ];
                            const cp = colorPairs[idx % colorPairs.length];

                            // Choose icon based on activity
                            const renderActivityIcon = () => {
                              switch (l.activity) {
                                case 'Login Attempt':
                                  return <LogIn className="w-4 h-4 text-indigo-500" />;
                                case 'MFA Verification':
                                  return <Fingerprint className="w-4 h-4 text-emerald-500" />;
                                case 'Biometric Auth':
                                  return <Activity className="w-4 h-4 text-sky-500" />;
                                case 'Password Reset':
                                  return <RotateCcw className="w-4 h-4 text-amber-500" />;
                                case 'Threat Blocked':
                                  return <ShieldAlert className="w-4 h-4 text-rose-500" />;
                                case 'System Backup':
                                  return <Terminal className="w-4 h-4 text-slate-500" />;
                                default:
                                  return <Shield className="w-4 h-4 text-blue-500" />;
                              }
                            };

                            return (
                              <tr 
                                key={l.id} 
                                className={`group hover:bg-slate-50/50 transition-all duration-200 cursor-pointer ${
                                  isQuarantined ? 'bg-red-50/30' : ''
                                }`}
                              >
                                <td className="px-6 py-4" onClick={() => setSelectedLogDetail(l)}>
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border ${
                                      l.status === 'FAILED' ? 'bg-red-100 text-red-700 border-red-200' : cp.bg
                                    }`}>
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-[#001D3D]">{l.email}</p>
                                        {isQuarantined && (
                                          <span className="text-[8px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full border border-rose-200 uppercase tracking-widest animate-pulse">
                                            QUARANTINED
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-mono">ID: {l.id}</p>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-6 py-4" onClick={() => setSelectedLogDetail(l)}>
                                  <div className="flex items-center gap-2 text-xs font-semibold text-[#001D3D]">
                                    {renderActivityIcon()}
                                    <span>{l.activity}</span>
                                  </div>
                                </td>

                                <td className="px-6 py-4" onClick={() => setSelectedLogDetail(l)}>
                                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                                    {l.ip}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-xs font-mono text-slate-400" onClick={() => setSelectedLogDetail(l)}>
                                  {l.timestamp} (today)
                                </td>

                                <td className="px-6 py-4" onClick={() => setSelectedLogDetail(l)}>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                    l.status === 'SUCCESS' 
                                      ? 'bg-teal-50 border-teal-200 text-[#006a60]' 
                                      : 'bg-red-50 border-red-200 text-[#ba1a1a]'
                                  }`}>
                                    {l.status}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-right relative">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenActionMenuId(openActionMenuId === l.id ? null : l.id);
                                    }}
                                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-primary transition-colors cursor-pointer"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {/* Absolute dropdown card */}
                                  <AnimatePresence>
                                    {openActionMenuId === l.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-45" 
                                          onClick={() => setOpenActionMenuId(null)}
                                        />
                                        <motion.div 
                                          initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                          className="absolute right-6 top-12 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-left"
                                        >
                                          <button 
                                            onClick={() => setSelectedLogDetail(l)}
                                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer font-medium"
                                          >
                                            <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                            <span>Inspect Payload</span>
                                          </button>
                                          <button 
                                            onClick={() => markSessionSafe(l.email, l.ip)}
                                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer font-medium"
                                          >
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Mark Node Safe</span>
                                          </button>
                                          <button 
                                            onClick={() => toggleQuarantine(l.email)}
                                            className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-700 text-xs flex items-center gap-2 cursor-pointer font-bold border-t border-slate-100"
                                          >
                                            <Ban className="w-3.5 h-3.5 text-rose-500" />
                                            <span>{isQuarantined ? 'Lift Quarantine' : 'Quarantine Identity'}</span>
                                          </button>
                                          <button 
                                            onClick={() => downloadSingleLogJwt(l)}
                                            className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 text-xs flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                                          >
                                            <Download className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Download Token JWT</span>
                                          </button>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Dynamic Pagination Footer */}
                  {!isFilterLoading && (
                    <div className="px-6 py-4 border-t border-[#E2E2E6] bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-slate-500 text-xs">
                        Showing <span className="font-bold text-slate-700">{totalLogsCount === 0 ? 0 : (logPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-bold text-slate-700">
                          {Math.min(logPage * itemsPerPage, totalLogsCount)}
                        </span>{' '}
                        of <span className="font-bold text-slate-700">{totalLogsCount.toLocaleString()}</span> results
                      </p>

                      <div className="flex items-center gap-1.5">
                        <button 
                          disabled={logPage === 1}
                          onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          Previous
                        </button>

                        {Array.from({ length: totalPages }).map((_, idx) => {
                          const p = idx + 1;
                          return (
                            <button
                              key={p}
                              onClick={() => setLogPage(p)}
                              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                                logPage === p
                                  ? 'bg-primary text-white'
                                  : 'border border-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}

                        <button 
                          disabled={logPage === totalPages}
                          onClick={() => setLogPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors text-xs font-semibold flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Aesthetic Detail: Log Inspector Dialog Popover */}
                <AnimatePresence>
                  {selectedLogDetail && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                      <motion.div 
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-[#0B1326] border border-slate-800 text-slate-300 shadow-2xl rounded-2xl p-6 max-w-2xl w-full relative font-mono"
                      >
                        <button 
                          onClick={() => setSelectedLogDetail(null)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 p-1 cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                          <Terminal className="text-emerald-400 w-5 h-5" />
                          <h3 className="text-sm font-bold text-slate-100">Audit Trail Token Decoupler v3.4.1</h3>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-slate-900/80 rounded-lg p-3.5 border border-slate-800 space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                              <span>VERIFIED TOKEN HEADERS</span>
                              <span className="text-emerald-400 font-bold">STATUS: VALID</span>
                            </div>
                            <pre className="text-sky-400 text-[11px] overflow-x-auto pt-1 leading-normal">
{JSON.stringify({
  alg: "HS256",
  typ: "JWT",
  kid: "secureauth-hsm-node-3"
}, null, 2)}
                            </pre>
                          </div>

                          <div className="bg-slate-900/80 rounded-lg p-3.5 border border-slate-800 space-y-1">
                            <p className="text-[10px] text-slate-500 uppercase">Cryptographic Token Decoded Payload</p>
                            <pre className="text-slate-100 text-[11px] overflow-x-auto pt-1 leading-normal text-wrap break-all whitespace-pre-wrap">
{JSON.stringify({
  jti: selectedLogDetail.id,
  sub: selectedLogDetail.email,
  iss: "secureauth.enterprise.gateway",
  ip_address: selectedLogDetail.ip,
  activity: selectedLogDetail.activity,
  verification_status: selectedLogDetail.status,
  timestamp_utc: selectedLogDetail.timestamp,
  auth_class: selectedLogDetail.category,
  audit_level: selectedLogDetail.severity,
  raw_message: selectedLogDetail.message,
  agent_handshake: {
    browser_cipher: "TLS_AES_256_GCM_SHA384",
    client_latency: "14ms",
    mfa_enforced_state: "active"
  }
}, null, 2)}
                            </pre>
                          </div>

                          <div className="bg-slate-950 rounded p-3 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                              <ShieldCheck className="w-4 h-4" />
                              <span>SSL HANDSHAKE SECURED</span>
                            </div>
                            <span className="text-slate-500">AES-256-GCM Signature OK</span>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end gap-2">
                          <button 
                            onClick={() => downloadSingleLogJwt(selectedLogDetail)}
                            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold rounded transition-colors cursor-pointer"
                          >
                            Download Decoupled JWT
                          </button>
                          <button 
                            onClick={() => setSelectedLogDetail(null)}
                            className="h-9 px-4 border border-slate-800 text-slate-400 hover:text-slate-100 font-mono text-[11px] rounded transition-colors cursor-pointer"
                          >
                            Close Portal
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl shadow-sm">
                  <h3 className="font-headline text-lg font-bold text-[#001D3D] mb-6">Security Policy Configuration</h3>
                  
                  <div className="space-y-6">
                    {/* Setting 1 */}
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">Enforce Multi-Factor Authentication Globally</p>
                        <p className="text-[11px] text-slate-500">Require MFA setup on registration for all newly created identities.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setEnforceMfa(!enforceMfa);
                          addLog('system', `Global MFA enforcement policy changed to ${!enforceMfa ? 'ENFORCED' : 'BYPASS'}.`, 'warning');
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                          enforceMfa ? 'bg-primary' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          enforceMfa ? 'right-1' : 'left-1'
                        }`}></div>
                      </button>
                    </div>

                    {/* Setting 2 */}
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">Session Expiration Timeout</p>
                        <p className="text-[11px] text-slate-500">Maximum duration of static authorization tokens before force refresh.</p>
                      </div>
                      <select 
                        value={sessionTimeout}
                        onChange={(e) => {
                          setSessionTimeout(e.target.value);
                          addLog('system', `Authentication expiration window modified to ${e.target.value}`, 'info');
                        }}
                        className="h-9 text-xs border border-slate-200 bg-white rounded-lg px-2 outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="5 mins">5 Minutes</option>
                        <option value="15 mins">15 Minutes</option>
                        <option value="1 hour">1 Hour</option>
                        <option value="8 hours">8 Hours</option>
                      </select>
                    </div>

                    {/* Setting 3 */}
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">Enforce Local IP Whitelist Mode</p>
                        <p className="text-[11px] text-slate-500">Block registration or authentication events originating from non-enterprise subnets.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setIpWhitelist(!ipWhitelist);
                          addLog('threat', `Subnet security whitelist constraints updated: ${!ipWhitelist ? 'STRICT' : 'PERMISSIVE'}`, 'warning');
                        }}
                        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none cursor-pointer ${
                          ipWhitelist ? 'bg-primary' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          ipWhitelist ? 'right-1' : 'left-1'
                        }`}></div>
                      </button>
                    </div>

                    {/* Setting 4 */}
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800">Operational Cryptographic Standard</p>
                        <p className="text-[11px] text-slate-500">Algorithms utilized to mask local client identity database tables.</p>
                      </div>
                      <div className="flex gap-2">
                        {['AES-256', 'AES-512', 'Quantum-Grade'].map((std) => (
                          <button
                            key={std}
                            onClick={() => {
                              setEncryptionLevel(std as any);
                              addLog('crypto', `Cryptographic standard transitioned to ${std}. Regenerating master key signatures...`, 'info');
                            }}
                            className={`px-3 py-1.5 text-[10px] font-bold font-mono rounded border transition-colors cursor-pointer ${
                              encryptionLevel === std 
                                ? 'bg-primary border-primary text-white' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {std}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'support' && (
              <motion.div 
                key="support-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-white p-6 border border-[#E2E2E6] rounded-xl shadow-sm space-y-4">
                  <div>
                    <h3 className="font-headline text-lg font-bold text-[#001D3D]">Submit Security Support Request</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Encountering credential anomalies? Fill out this fast form to log a help ticket with SecOps.
                    </p>
                  </div>

                  {supportSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs p-3 rounded-lg">
                      {supportSuccess}
                    </div>
                  )}

                  <form onSubmit={handleSupportSubmit} className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 block">Incident Subject</label>
                      <input 
                        type="text"
                        required
                        value={supportSubject}
                        onChange={(e) => setSupportSubject(e.target.value)}
                        placeholder="e.g., Anomalous login failure from IP 45.23..."
                        className="w-full h-11 px-4 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 block">Description &amp; Diagnostic Logs</label>
                      <textarea 
                        required
                        rows={4}
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        placeholder="Provide details on the security issue or credential recovery request..."
                        className="w-full p-4 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-bold text-xs rounded-lg transition-all shadow cursor-pointer flex items-center justify-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Log Support Ticket</span>
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

      {/* CREATE NEW USER MODAL OVERLAY */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#0B1326]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#E2E2E6] shadow-2xl rounded-2xl p-6 max-w-md w-full relative"
            >
              <button 
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="text-primary w-5 h-5" />
                <h3 className="font-headline text-base font-bold text-[#001D3D]">Create Enterprise Identity</h3>
              </div>

              {newUserError && (
                <div className="bg-red-50 border border-red-200 text-[#ba1a1a] text-xs p-3 rounded-lg mb-4">
                  {newUserError}
                </div>
              )}

              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g., Alex Smith"
                    className="w-full h-10 px-4 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">Account Email</label>
                  <input 
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g., alex.smith@secureauth.io"
                    className="w-full h-10 px-4 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block">System Role</label>
                    <select 
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-slate-700 font-medium cursor-pointer"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block">Account Status</label>
                    <select 
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white text-slate-700 font-medium cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">Initial Security Password</label>
                  <input 
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 px-4 text-sm border border-slate-200 rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox"
                    id="new-mfa-toggle"
                    checked={newMfaEnabled}
                    onChange={(e) => setNewMfaEnabled(e.target.checked)}
                    className="h-4 w-4 text-primary rounded border-slate-200 focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="new-mfa-toggle" className="text-xs font-semibold text-slate-600 cursor-pointer">
                    Enforce Immediate Multi-Factor Challenge (MFA)
                  </label>
                </div>

                <div className="pt-4 flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="h-10 px-4 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="h-10 px-4 bg-primary hover:bg-[#004395] text-white text-xs font-bold rounded-lg transition-all shadow cursor-pointer"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}