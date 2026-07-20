import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, Mail, Lock, ShieldAlert, KeyRound, ArrowLeft, RefreshCw, 
  CheckCircle2, Eye, EyeOff, Cpu, ArrowRight, UserCheck, UserPlus, Smartphone,
  Shield, Clock, AlertCircle
} from 'lucide-react';
import { User } from '../types';

interface AuthPagesProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard' | 'admin') => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addLog: (category: 'auth' | 'system' | 'crypto' | 'threat', message: string, severity: 'info' | 'warning' | 'critical') => void;
}

// Simple base32 simulator for high-fidelity secret generation
function generateMfaSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Calculate simulated password entropy
function checkPasswordStrength(password: string) {
  let score = 0;
  const checks = [
    { label: 'Minimum 8 characters', passed: password.length >= 8 },
    { label: 'Includes uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Includes lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Includes number or special symbol', passed: /[\d\W]/.test(password) },
  ];

  checks.forEach(check => {
    if (check.passed) score++;
  });

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/\d/.test(password)) poolSize += 10;
  if (/\W/.test(password)) poolSize += 32;

  const entropy = password.length > 0 && poolSize > 0 
    ? Math.round(password.length * Math.log2(poolSize)) 
    : 0;

  let label = 'Insecure';
  let color = 'bg-red-500';

  if (entropy >= 80 && score === 4) {
    label = 'Enterprise (Military-Grade)';
    color = 'bg-primary';
  } else if (score === 4) {
    label = 'Strong';
    color = 'bg-emerald-500';
  } else if (score >= 2) {
    label = 'Moderate';
    color = 'bg-amber-500';
  } else if (password.length > 0) {
    label = 'Weak';
    color = 'bg-red-500';
  }

  return { score, entropy, label, color, checks };
}

// TOTP mock simulator that is synchronized with seconds
export function useMockTotp(secret: string) {
  const [code, setCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    const calculateCode = () => {
      if (!secret) return;
      const epoch = Math.floor(Date.now() / 30000);
      let hash = 0;
      for (let i = 0; i < secret.length; i++) {
        hash = secret.charCodeAt(i) + ((hash << 5) - hash);
      }
      const mixed = Math.abs(hash ^ epoch);
      const otp = (mixed % 900000) + 100000; // Force 6 digits
      setCode(otp.toString());
    };

    calculateCode();
    
    const interval = setInterval(() => {
      const seconds = new Date().getSeconds();
      const remaining = 30 - (seconds % 30);
      setTimeLeft(remaining);
      if (remaining === 30) {
        calculateCode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [secret]);

  return { code, timeLeft };
}

export default function AuthPages({ 
  onNavigate, 
  currentUser, 
  setCurrentUser, 
  users, 
  setUsers,
  addLog
}: AuthPagesProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // Step 2 is MFA confirmation
  const [mfaSecret, setMfaSecret] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(300); // 5 minutes (300 seconds)

  // Auto handle step changes to reset OTP input state
  useEffect(() => {
    if (step === 2) {
      setCountdown(300);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpInput('');
    }
  }, [step]);

  // Countdown clock ticking down every second
  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, countdown]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDigitChange = (index: number, value: string) => {
    // Only allow alphanumeric to support letters and numbers, but cleaned to match token patterns
    const cleanedValue = value.replace(/[^0-9A-Za-z]/g, '');
    const newDigits = [...otpDigits];
    
    // Take the last character entered
    newDigits[index] = cleanedValue.slice(-1);
    setOtpDigits(newDigits);
    
    const fullCode = newDigits.join('');
    setOtpInput(fullCode);

    // If typing and not the last box, move focus forward
    if (cleanedValue && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setOtpInput(newDigits.join(''));
        
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
        setOtpInput(newDigits.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9A-Za-z]/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedData[i] || '';
      }
      setOtpDigits(newDigits);
      setOtpInput(pastedData);
      
      const focusIdx = Math.min(pastedData.length, 5);
      const targetInput = document.getElementById(`otp-input-${focusIdx}`);
      targetInput?.focus();
    }
  };

  const handleResendOtp = () => {
    setError('');
    setSuccess('A new 6-digit verification code has been dispatched successfully.');
    setCountdown(300);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpInput('');
    addLog('system', `Verification token reset and resent for ${email}`, 'info');
  };

  // Pre-populate some demo credentials if the user base is empty for instant interactive validation
  useEffect(() => {
    if (users.length === 0) {
      const demoUser: User = {
        email: 'user@example.secure',
        mfaSecret: 'SECUREAUTHDEMOSECRET',
        mfaEnabled: true,
        registeredAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        fullName: 'Demo Operator',
        role: 'User',
        status: 'Active'
      };
      // For simulator reference
      (demoUser as any).password = 'AdminPass123!';
      const updated = [demoUser];
      setUsers(updated);
      localStorage.setItem('secureauth_users', JSON.stringify(updated));
    }
  }, [users, setUsers]);

  // Set email value to demo user when in login mode if desired, or let it stay clean
  useEffect(() => {
    if (mode === 'login' && email === '') {
      setEmail('user@example.secure');
      setPassword('AdminPass123!');
    } else if (mode === 'register') {
      setEmail('');
      setPassword('');
      setMfaSecret(generateMfaSecret());
    } else if (mode === 'forgot-password') {
      setError('');
      setSuccess('');
    } else if (mode === 'reset-password') {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setError('');
      setSuccess('');
    }
    setStep(1);
  }, [mode]);

  const strength = checkPasswordStrength(password);
  const { code: currentOtpCode, timeLeft } = useMockTotp(mfaSecret || 'SECUREAUTHSECRET');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid business email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must meet minimum 8-character requirements.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError('An account with this email is already registered under SecureAuth.');
      return;
    }

    setStep(2);
    addLog('auth', `MFA setup wizard initialized for user ${email}`, 'info');
  };

  const handleVerifyAndCompleteRegister = () => {
    setError('');
    
    if (otpInput !== currentOtpCode) {
      setError('Invalid authenticator token. Please verify the active simulator code.');
      addLog('threat', `Failed MFA setup attempt for ${email}. Invalid code: ${otpInput}`, 'warning');
      return;
    }

    const newUser: User = {
      email: email.toLowerCase(),
      mfaSecret,
      mfaEnabled: true,
      registeredAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      fullName: email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      role: 'User',
      status: 'Active'
    };
    (newUser as any).password = password;

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('secureauth_users', JSON.stringify(updatedUsers));

    setSuccess('SecureAuth profile provisioned successfully! Proceeding to operations portal...');
    addLog('auth', `User account ${email} created with Active MFA.`, 'info');
    
    setTimeout(() => {
      setCurrentUser(newUser);
      onNavigate(newUser.role === 'Admin' ? 'admin' : 'dashboard');
    }, 1500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && (u as any).password === password);
    if (!foundUser) {
      setError('Invalid credentials. Please try again.');
      addLog('threat', `Failed authentication attempt for email: ${email}`, 'warning');
      return;
    }

    setMfaSecret(foundUser.mfaSecret);
    setStep(2);
    addLog('auth', `Password verified for ${email}. Prompting for OTP code.`, 'info');
  };

  const handleVerifyLogin = () => {
    setError('');

    if (otpInput !== currentOtpCode) {
      setError('MFA Authentication Failed. Correct token required.');
      addLog('threat', `Failed OTP validation for ${email}`, 'critical');
      return;
    }

    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setCurrentUser(foundUser);
      setSuccess('MFA verification successful. Access granted.');
      addLog('auth', `MFA verified for ${email}. Initializing secure session.`, 'info');
      
      setTimeout(() => {
        const userRole = foundUser.role || 'User';
        onNavigate(userRole === 'Admin' ? 'admin' : 'dashboard');
      }, 1000);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid business email address.');
      addLog('threat', `Attempted invalid email format password reset for: ${email || 'blank'}`, 'warning');
      return;
    }

    const foundUserIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    
    let updatedUsers = [...users];
    if (foundUserIndex !== -1) {
      const updatedUser = { ...updatedUsers[foundUserIndex] };
      if (password) {
        (updatedUser as any).password = password;
        updatedUsers[foundUserIndex] = updatedUser;
        setUsers(updatedUsers);
        localStorage.setItem('secureauth_users', JSON.stringify(updatedUsers));
        addLog('auth', `Password credentials successfully updated & re-encrypted with AES-256 for: ${email}`, 'info');
      }
    } else {
      setError('Email address is not registered under any operational profile.');
      return;
    }

    addLog('auth', `Password reset token requested and dispatched for: ${email}`, 'warning');
    setSuccess(`Password updated successfully! A security recovery confirmation has been dispatched to ${email}. Redirecting...`);

    setTimeout(() => {
      setSuccess('');
      setMode('login');
    }, 2500);
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Password must meet minimum 8-character requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Review entered credentials.');
      return;
    }

    // Direct the user to the reset password page where they enter email to complete
    addLog('auth', `New password requirements satisfied. Directing user to email association reset page.`, 'info');
    setMode('forgot-password');
  };

  return (
    <div className="min-h-screen flex flex-col font-body bg-surface-light antialiased text-primary select-none">
      
      {/* Top Navigation */}
      <header className="w-full top-0 sticky z-50 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center h-20 px-6 md:px-16 max-w-7xl mx-auto">
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-95 transition-opacity"
          >
            <ShieldCheck className="text-primary w-8 h-8" />
            <span className="font-headline text-2xl font-bold text-primary tracking-tight">SecureAuth</span>
          </div>
          <div className="flex gap-6">
            <button 
              onClick={() => onNavigate('landing')}
              className="text-slate-500 font-medium text-sm hover:text-primary transition-colors cursor-pointer"
            >
              Back to main page
            </button>
            <button 
              onClick={() => {
                addLog('system', 'Operator accessed system status node', 'info');
                alert('System status node: ALL SYSTEMS OPERATIONAL (99.99% uptime)');
              }}
              className="text-slate-500 font-medium text-sm hover:text-primary transition-colors cursor-pointer hidden sm:block"
            >
              Status
            </button>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-grow flex items-center justify-center py-12 px-6 relative bg-surface-light overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-5 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-primary rounded-full blur-[160px]"></div>
        </div>

        {/* Dynamic transition Container */}
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 relative z-10">
          
          {/* Glass-container centered login card styled EXACTLY like the HTML code */}
          <motion.section 
            layout
            className="w-full max-w-[420px] bg-white border border-gray-200 shadow-xl rounded-xl p-8 flex flex-col relative"
          >
            {step === 1 ? (
              mode === 'reset-password' ? (
                <div className="flex flex-col items-center mb-6 text-center">
                  {/* Logo centered */}
                  <div className="flex items-center gap-2 justify-center mb-4">
                    <ShieldCheck className="text-primary w-6 h-6" />
                    <span className="font-headline text-xl font-bold text-primary tracking-tight">SecureAuth</span>
                  </div>
                  <h1 className="font-headline text-2xl font-bold text-primary mb-1">
                    Create a New Password
                  </h1>
                  <p className="text-xs text-slate-500 max-w-[280px]">
                    Choose a strong password you haven't used before
                  </p>
                </div>
              ) : mode === 'forgot-password' ? (
                <div className="flex flex-col items-center mb-6 text-center">
                  <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center mb-4 border border-blue-100">
                    <RefreshCw className="w-6 h-6 animate-spin-slow text-primary" />
                  </div>
                  <h1 className="font-headline text-2xl font-bold text-primary mb-1">
                    Reset Your Password
                  </h1>
                  <p className="text-xs text-slate-500 max-w-[280px]">
                    Enter your registered email and we'll send you a reset link
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center mb-6 text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                    <UserCheck className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="font-headline text-2xl font-bold text-primary mb-1">
                    {mode === 'login' ? 'Welcome Back' : 'Deploy New Account'}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {mode === 'login' ? 'Log in to your secure console' : 'Register a new profile and pair MFA'}
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center mb-6 text-center">
                {/* Logo centered */}
                <div className="flex items-center gap-2 justify-center mb-6">
                  <ShieldCheck className="text-primary w-6 h-6" />
                  <span className="font-headline text-xl font-bold text-primary tracking-tight">SecureAuth</span>
                </div>
                
                {/* Verify Your Identity */}
                <div className="flex items-center gap-2 text-primary justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                  <h1 className="font-headline text-lg md:text-xl font-medium tracking-tight">Verify Your Identity</h1>
                </div>
                <p className="text-xs text-slate-500 mt-2 max-w-[285px] leading-relaxed">
                  Enter the 6-digit code sent to your email
                </p>
              </div>
            )}

            {/* Error & Success status */}
            {error && step === 1 && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs px-3.5 py-2.5 rounded flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-normal">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs px-3.5 py-2.5 rounded flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-normal">{success}</span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 ? (
                mode === 'reset-password' ? (
                  <motion.form 
                    key="reset-password"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleResetPasswordSubmit} 
                    className="space-y-4"
                  >
                    {/* New Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 block" htmlFor="new-password">
                        New Password
                      </label>
                      <div className="relative">
                        <input 
                          className="w-full h-11 pl-4 pr-10 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          id="new-password" 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button 
                          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-primary transition-colors cursor-pointer" 
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Strength Indicator matching screenshot exactly */}
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5 w-full">
                        {[1, 2, 3, 4].map((barIdx) => {
                          const isActive = password.length > 0 && barIdx <= Math.ceil((strength.entropy || 0) / 24);
                          let barColor = 'bg-slate-100';
                          if (isActive) {
                            if (strength.label === 'WEAK') barColor = 'bg-red-500';
                            else if (strength.label === 'MEDIUM') barColor = 'bg-amber-500';
                            else if (strength.label === 'STRONG') barColor = 'bg-emerald-500';
                            else if (strength.label === 'CRITICAL SECURE') barColor = 'bg-[#1b73e8]';
                          }
                          return (
                            <div key={barIdx} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${barColor}`} />
                          );
                        })}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">
                        Password Strength: {password ? strength.label : 'Enter characters...'}
                      </p>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 block" htmlFor="confirm-password">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input 
                          className="w-full h-11 pl-4 pr-10 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          id="confirm-password" 
                          placeholder="••••••••" 
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button 
                          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-primary transition-colors cursor-pointer" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          type="button"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Trigger */}
                    <div className="pt-2">
                      <button 
                        className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-headline font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg active:translate-y-px flex items-center justify-center gap-2 cursor-pointer" 
                        type="submit"
                      >
                        Reset Password
                      </button>
                    </div>

                    {/* AES-256 Separator Line & Badge */}
                    <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-center gap-1.5 text-slate-400 text-[10px] font-mono tracking-wider uppercase">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Secure AES-256 Encryption</span>
                    </div>

                    {/* Back Link */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-xs text-primary hover:underline font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to Login
                      </button>
                    </div>
                  </motion.form>
                ) : mode === 'forgot-password' ? (
                  <motion.form 
                    key="forgot-password"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={handleForgotPasswordSubmit} 
                    className="space-y-4"
                  >
                    {/* Email / Username */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 block" htmlFor="forgot-identity">
                        Email Address
                      </label>
                      <div className="relative">
                        <input 
                          className="w-full h-11 px-4 text-sm font-medium text-primary border border-gray-300 rounded-lg outline-none bg-white transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          id="forgot-identity" 
                          placeholder="name@company.com" 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Submit Trigger */}
                    <div className="pt-2">
                      <button 
                        className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-headline font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg active:translate-y-px flex items-center justify-center gap-2 cursor-pointer" 
                        type="submit"
                      >
                        Send Reset Link
                      </button>
                    </div>

                    {/* Back Link */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="text-xs text-primary hover:underline font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to Login
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  <motion.form 
                    key="form1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onSubmit={mode === 'register' ? handleRegister : handleLogin} 
                    className="space-y-4"
                  >
                    {/* Email / Username */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 block" htmlFor="identity">
                        Business Email Address
                      </label>
                      <div className="relative">
                        <input 
                          className={`w-full h-11 px-4 text-sm font-medium text-primary border rounded-lg outline-none bg-white transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                            error && !email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-300'
                          }`}
                          id="identity" 
                          placeholder="operator@company.secure" 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-500 block" htmlFor="password">
                          Access Password
                        </label>
                        {mode === 'login' && (
                          <button 
                            type="button"
                            onClick={() => setMode('reset-password')}
                            className="text-xs text-primary hover:underline font-bold cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                          className="w-full h-11 pl-4 pr-10 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                          id="password" 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button 
                          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-primary transition-colors cursor-pointer" 
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {mode === 'register' && password.length > 0 && (
                      <div className="bg-slate-50 border border-gray-100 rounded-lg p-3 space-y-2 mt-2">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                          <span>ENTROPY: {strength.entropy} BITS</span>
                          <span className="font-bold text-primary">{strength.label}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${Math.min(100, (strength.entropy / 96) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Submit Trigger */}
                    <div className="pt-2">
                      <button 
                        className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-headline font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg active:translate-y-px flex items-center justify-center gap-2 cursor-pointer" 
                        type="submit"
                      >
                        {mode === 'login' ? 'Login' : 'Configure MFA Security'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.form>
                )) : (
                <motion.div 
                  key="form2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {/* 6 Digit Inputs container */}
                  <div className="flex justify-center gap-2 md:gap-3 py-2" onPaste={handlePaste}>
                    {otpDigits.map((digit, idx) => {
                      // Let's check if there is an active error to style it with a red border
                      // Just like the red '!' box in the screenshot!
                      const isErrorState = error !== '';
                      // Let's replicate the screenshot's '!' if error occurs on the 4th box (index 3) when it's blank or if any are invalid
                      const displayValue = isErrorState && idx === 3 && digit === '' ? '!' : digit;
                      const hasWarningChar = displayValue === '!';

                      return (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={displayValue}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(idx, e)}
                          className={`w-11 h-14 md:w-12 md:h-16 text-center text-xl md:text-2xl font-mono font-bold rounded-xl border border-gray-300 outline-none transition-all bg-white cursor-text select-text
                            ${hasWarningChar || isErrorState 
                              ? 'border-red-500 text-red-500 ring-2 ring-red-500/10' 
                              : 'border-slate-200 text-primary focus:border-primary focus:ring-2 focus:ring-primary/10'
                            }`}
                        />
                      );
                    })}
                  </div>

                  {/* Red error message styled exactly like the screenshot */}
                  {error && (
                    <div className="flex items-center justify-center gap-1.5 text-red-500 font-mono text-[11px] md:text-xs py-1">
                      <span className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center font-bold text-[10px]">!</span>
                      <span>Invalid or expired code</span>
                    </div>
                  )}

                  {/* Expiration timer countdown clock */}
                  <div className="flex items-center justify-center gap-1.5 text-slate-500 font-mono text-[11px] md:text-xs py-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Code expires in <strong className="font-bold text-primary">{formatCountdown(countdown)}</strong></span>
                  </div>

                  {/* Primary verification blue button */}
                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={mode === 'register' ? handleVerifyAndCompleteRegister : handleVerifyLogin}
                      disabled={otpInput.length !== 6}
                      className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-headline font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Verify Code
                    </button>
                  </div>

                  {/* Footer help links in card */}
                  <div className="text-center pt-4">
                    <p className="text-xs text-slate-500">
                      Didn't receive the code?{' '}
                      <button 
                        type="button"
                        onClick={handleResendOtp}
                        className="text-slate-400 hover:text-primary font-bold hover:underline cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    </p>
                  </div>

                  {/* Quick Back button for easy step correction */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-slate-400 hover:text-primary transition-colors cursor-pointer underline"
                    >
                      Back to Credentials
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Account Switch links */}
            {step === 1 && mode !== 'forgot-password' && mode !== 'reset-password' && (
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-slate-500">
                  {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <button 
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    {mode === 'login' ? 'Register' : 'Login'}
                  </button>
                </p>
              </div>
            )}
          </motion.section>

          {/* Simulated Mobile Device MFA token display alongside card (Interactive Device Help) */}
          <AnimatePresence>
            {(step === 2 || mode === 'register') && (
              <motion.div 
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-[340px] bg-slate-900 text-white rounded-2xl p-5 border border-slate-700 shadow-2xl relative"
              >
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-full"></div>
                
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[9px] uppercase tracking-widest mb-3">
                    <Cpu className="w-3 h-3 animate-spin" />
                    INTEGRATED MFA SIMULATOR
                  </div>
                  
                  <h3 className="font-headline text-sm font-semibold text-white mb-1">
                    SecureAuth Key Code
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-normal mb-4">
                    In a production deployment, this OTP appears on your Google Authenticator or hardware token. Copy the simulator code below to complete the secure verification step.
                  </p>

                  {/* Simulated screen token */}
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-center">
                    <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-slate-500">
                      <span>MFA OTP NODE</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        {timeLeft}s
                      </span>
                    </div>

                    <div className="text-2xl font-mono font-bold tracking-widest text-white mb-2">
                      {currentOtpCode.slice(0, 3)} {currentOtpCode.slice(3)}
                    </div>

                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 transition-all duration-1000 ease-linear origin-left"
                        style={{ width: `${(timeLeft / 30) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setOtpInput(currentOtpCode);
                      addLog('system', 'Copied secure token directly from simulator screen', 'info');
                    }}
                    className="w-full mt-3 h-9 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    Autofill Secure Token
                  </button>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
                    <span>KEY: {mfaSecret.substring(0, 8)}...</span>
                    <span>AES-256 SYNC</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 bg-white border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 md:px-16 max-w-7xl mx-auto gap-6">
          <div className="flex flex-col gap-1 text-center md:text-left">
            <div className="font-headline text-lg font-bold text-primary">SecureAuth</div>
            <p className="text-xs text-slate-500">© 2026 SecureAuth. All rights reserved. Precise Security Engineering.</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <button className="text-xs text-slate-500 hover:text-primary underline cursor-pointer">Privacy Policy</button>
            <button className="text-xs text-slate-500 hover:text-primary underline cursor-pointer">Terms of Service</button>
            <button className="text-xs text-slate-500 hover:text-primary underline cursor-pointer">Security Whitepaper</button>
            <button className="text-xs text-slate-500 hover:text-primary underline cursor-pointer">Contact</button>
          </nav>
        </div>
      </footer>

    </div>
  );
}
