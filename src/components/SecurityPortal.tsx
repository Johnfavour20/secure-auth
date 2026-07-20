import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, LogOut, CheckCircle2, Clock, Shield
} from 'lucide-react';
import { User, LogEntry } from '../types';
import { logoutUser } from '../api/auth';

interface SecurityPortalProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard' | 'admin') => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setSessionToken?: (token: string | null) => void;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  addLog: (category: 'auth' | 'system' | 'crypto' | 'threat', message: string, severity: 'info' | 'warning' | 'critical') => void;
}

export default function SecurityPortal({ 
  onNavigate, 
  currentUser, 
  setCurrentUser,
  setSessionToken,
  addLog
}: SecurityPortalProps) {
  const userEmail = currentUser?.email || 'user@example.secure';
  const displayName = currentUser?.fullName || (userEmail === 'user@example.secure' ? 'Alex Johnson' : userEmail.split('@')[0]);

  // Dynamic session countdown state starting at 24 minutes and 56 seconds (1496 seconds)
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState(1496);

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = () => {
    void logoutUser().catch((requestError) => console.error('Logout request failed:', requestError));

    addLog('auth', `User ${userEmail} signed out. Session closed securely.`, 'info');
    setCurrentUser(null);
    setSessionToken?.(null);
    onNavigate('landing');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-[#00224d] font-sans flex flex-col relative antialiased select-none">
      
      {/* Top Header */}
      <header className="w-full top-0 sticky z-50 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center h-20 px-6 md:px-16 max-w-7xl mx-auto">
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-95 transition-opacity"
          >
            <ShieldCheck className="text-primary w-8 h-8" />
            <span className="font-headline text-2xl font-bold text-primary tracking-tight">SecureAuth</span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* User Profile Avatar and Name */}
            <div className="flex items-center gap-3">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80" 
                alt="Alex Johnson" 
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
              <span className="text-slate-800 font-medium text-sm hidden sm:block">
                {displayName}
              </span>
            </div>

            {/* Logout Button */}
            <button 
              onClick={() => onNavigate('admin')}
              className="text-xs bg-[#002B5B] hover:bg-[#002B5B]/90 text-white font-mono font-bold px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              Admin Console
            </button>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 border border-[#006a60] text-[#006a60] hover:bg-teal-50/50 px-4 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main dashboard content area */}
      <main className="flex-grow flex flex-col items-center justify-center py-16 px-6 max-w-7xl mx-auto w-full">
        
        {/* Welcome message */}
        <h1 className="text-4xl md:text-5xl font-bold text-[#00224d] tracking-tight text-center">
          Welcome back, {displayName}
        </h1>

        {/* Securely logged-in pill banner */}
        <div className="bg-[#e6f4f1] border border-[#b2dfdb] text-[#004d40] px-6 py-2.5 rounded-full inline-flex items-center gap-2 text-xs font-semibold tracking-wide font-mono shadow-sm mt-6 text-center">
          <Shield className="w-4 h-4 text-[#006a60]" />
          <span>You are securely logged in with multi-factor authentication</span>
        </div>

        {/* The 3 Elegant Operations Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full mt-12 md:mt-16">
          
          {/* Card 1: Account Status */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-wider font-mono uppercase">
                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                <span>ACCOUNT STATUS</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-[#00897b] flex items-center gap-1.5 mt-6">
                • {currentUser?.accountStatus || currentUser?.status || 'Active'}
              </div>
            </div>
          </div>

          {/* Card 2: Last Login */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-wider font-mono uppercase">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>LAST LOGIN</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-[#00224d] mt-6 leading-tight">
                Oct 24, 2024 • 10:42 AM
              </div>
            </div>
          </div>

          {/* Card 3: Session Security */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 tracking-wider font-mono uppercase">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>SESSION SECURITY</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-[#00224d] mt-6">
                Expires in {formatSessionTime(sessionSecondsLeft)}
              </div>
              
              {/* Sleek countdown progress bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-[#00897b] transition-all duration-1000 ease-linear origin-left"
                  style={{ width: `${(sessionSecondsLeft / 1496) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Strictly NO Footer component here inside the dashboard as explicitly requested! */}
      
    </div>
  );
}