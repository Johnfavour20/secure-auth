import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  UserCheck,
  ArrowLeft,
  Shield,
  Clock,
  Mail,
  Lock,
} from 'lucide-react';
import { User } from '../types';
import { forgotPassword } from '../api/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://secure-auth-1.onrender.com/api';

interface AuthPagesProps {
  onNavigate: (view: 'landing' | 'login' | 'register' | 'dashboard' | 'admin') => void;
  authMode: 'login' | 'register';
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addLog: (category: 'auth' | 'system' | 'crypto' | 'threat', message: string, severity: 'info' | 'warning' | 'critical') => void;
}

function checkPasswordStrength(password: string) {
  let score = 0;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[\d\W]/.test(password),
  ];

  checks.forEach((passed) => {
    if (passed) score++;
  });

  const entropy = Math.round(password.length * 6.5);

  if (score === 4) {
    return { label: 'Strong', color: 'bg-emerald-500', entropy };
  }
  if (score >= 2) {
    return { label: 'Moderate', color: 'bg-amber-500', entropy };
  }
  return { label: 'Weak', color: 'bg-red-500', entropy };
}

export default function AuthPages({
  onNavigate,
  authMode,
  setCurrentUser,
  setSessionToken,
  users,
  setUsers,
  addLog,
}: AuthPagesProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMode(authMode);
    setStep(1);
    setError('');
    setSuccess('');
  }, [authMode]);

  useEffect(() => {
    if (step !== 2) return;

    setCountdown(300);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [step, pendingUserId]);

  const strength = useMemo(() => checkPasswordStrength(password), [password]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const upsertUser = (user: User) => {
    setUsers((prev) => {
      const normalized = {
        ...user,
        status: user.accountStatus,
        mfaEnabled: true,
      };
      const filtered = prev.filter((existingUser) => existingUser.email !== normalized.email);
      return [normalized, ...filtered];
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Registration failed.');
        return;
      }

      addLog('auth', `Account registered for ${email.trim().toLowerCase()}.`, 'info');
      setPendingUserId(data.userId ?? null);
      setStep(2);
      setOtpInput('');
      setPassword('');
      setConfirmPassword('');
      setSuccess(data.message ?? 'Registration successful. Check your email for the verification code to continue.');
    } catch (requestError) {
      console.error(requestError);
      setError('Unable to reach the Flask API. Make sure the backend is running on port 5000.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Login failed.');
        addLog('threat', `Failed login attempt for ${email.trim().toLowerCase()}.`, 'warning');
        return;
      }

      // Password was correct, but the backend now requires a second factor
      // before a session is created. Move to the OTP step instead of
      // logging the user in directly.
      addLog('auth', `Password verified for ${email.trim().toLowerCase()}. OTP sent.`, 'info');
      setPendingUserId(data.userId ?? null);
      setStep(2);
      setOtpInput('');
      setSuccess(data.message ?? 'Password verified. Enter the OTP sent to your email to complete login.');
    } catch (requestError) {
      console.error(requestError);
      setError('Unable to reach the Flask API. Make sure the backend is running on port 5000.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && otpInput.length === 6 && !isSubmitting && pendingUserId) {
      event.preventDefault();
      void handleVerifyLogin();
    }
  };

  const handleVerifyLogin = async () => {
    if (!pendingUserId) {
      setError('Missing pending login session. Please sign in again.');
      return;
    }

    resetMessages();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: pendingUserId,
          otp: otpInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'OTP verification failed.');
        addLog('threat', `Failed OTP verification for ${email.trim().toLowerCase()}.`, 'critical');
        return;
      }

      const authenticatedUser: User = {
        ...data.user,
        status: data.user.accountStatus,
        mfaEnabled: true,
      };

      setCurrentUser(authenticatedUser);
      setSessionToken(data.sessionToken ?? null);
      upsertUser(authenticatedUser);
      addLog('auth', `Secure session established for ${authenticatedUser.email}.`, 'info');
      setSuccess('Verification successful. Redirecting...');

      window.setTimeout(() => {
        onNavigate(authenticatedUser.role === 'Admin' ? 'admin' : 'dashboard');
      }, 700);
    } catch (requestError) {
      console.error(requestError);
      setError('Unable to reach the Flask API. Make sure the backend is running on port 5000.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingUserId) return;

    resetMessages();

    try {
      const response = await fetch(`${API_BASE_URL}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: pendingUserId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Unable to resend OTP.');
        return;
      }

      setCountdown(300);
      if (data.debugOtp) {
        setOtpInput(String(data.debugOtp));
        setSuccess(`${data.message ?? 'Use this OTP code to continue:'} ${data.debugOtp}`);
      } else {
        setOtpInput('');
        setSuccess('A new OTP has been sent to your email.');
      }
      addLog('system', `OTP resent for ${email.trim().toLowerCase()}.`, 'info');
    } catch (requestError) {
      console.error(requestError);
      setError('Unable to reach the Flask API. Make sure the backend is running on port 5000.');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      const response = await forgotPassword(email.trim().toLowerCase());
      setSuccess(response.data.message ?? 'If that email exists, a reset link has been sent.');
      addLog('system', `Password reset requested for ${email.trim().toLowerCase()}.`, 'info');
    } catch (resetError) {
      console.error(resetError);
      setError('Unable to request password reset. Please try again later.');
    }
  };

  const heading =
    step === 2 ? 'Verify Your Identity' : mode === 'register' ? 'Create Account' : mode === 'forgot-password' ? 'Reset Password' : 'Welcome Back';

  const subheading =
    step === 2
      ? 'Enter the 6-digit code sent to your email address'
      : mode === 'register'
        ? 'Register a new profile backed by the Flask API'
        : mode === 'forgot-password'
          ? 'Enter your email to receive a password reset link.'
          : 'Sign in with your email and password';

  return (
    <div className="min-h-screen flex flex-col font-body bg-surface-light antialiased text-primary">
      <header className="w-full top-0 sticky z-50 bg-white border-b border-gray-200">
        <div className="flex justify-between items-center h-20 px-6 md:px-16 max-w-7xl mx-auto">
          <div
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-95 transition-opacity"
          >
            <ShieldCheck className="text-primary w-8 h-8" />
            <span className="font-headline text-2xl font-bold text-primary tracking-tight">SecureAuth</span>
          </div>
          <button
            onClick={() => onNavigate('landing')}
            className="text-slate-500 font-medium text-sm hover:text-primary transition-colors cursor-pointer"
          >
            Back to main page
          </button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center py-12 px-6 relative bg-surface-light overflow-hidden">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center justify-center gap-8 relative z-10">
          <motion.section className="w-full max-w-[440px] bg-white border border-gray-200 shadow-xl rounded-xl p-8 flex flex-col relative">
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                {step === 2 ? <Shield className="w-6 h-6 text-primary" /> : <UserCheck className="w-6 h-6 text-primary" />}
              </div>
              <h1 className="font-headline text-2xl font-bold text-primary mb-1">{heading}</h1>
              <p className="text-xs text-slate-500 max-w-[320px]">{subheading}</p>
            </div>

            {error && (
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
                <motion.div
                  key={`mode-${mode}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {mode === 'forgot-password' ? (
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 block" htmlFor="forgot-email">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            id="forgot-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-11 pl-10 pr-4 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                            placeholder="name@company.com"
                          />
                        </div>
                      </div>

                      <button
                        className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-headline font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        type="submit"
                      >
                        Send Reset Link
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            resetMessages();
                            setMode('login');
                            onNavigate('login');
                          }}
                          className="text-xs text-primary hover:underline font-bold flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          Back to Login
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-4">
                      {mode === 'register' && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-500 block" htmlFor="full-name">
                            Full Name
                          </label>
                          <input
                            id="full-name"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full h-11 px-4 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                            placeholder="Marcus Kane"
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-500 block" htmlFor="email">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-11 pl-10 pr-4 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                            placeholder="operator@company.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-slate-500 block" htmlFor="password">
                            Password
                          </label>
                          {mode === 'login' && (
                            <button
                              type="button"
                              onClick={() => setMode('forgot-password')}
                              className="text-xs text-primary hover:underline font-bold cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-11 pl-10 pr-10 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                            placeholder="••••••••"
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

                      {mode === 'register' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-500 block" htmlFor="confirm-password">
                              Confirm Password
                            </label>
                            <div className="relative">
                              <input
                                id="confirm-password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-11 px-4 pr-10 text-sm text-primary border border-gray-300 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                                placeholder="••••••••"
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

                          <div className="bg-slate-50 border border-gray-100 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                              <span>ENTROPY: {strength.entropy} BITS</span>
                              <span className="font-bold text-primary">{strength.label}</span>
                            </div>
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${strength.color}`}
                                style={{ width: `${Math.min(100, (strength.entropy / 80) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <button
                        className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-headline font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                        {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                      </button>
                    </form>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block" htmlFor="otp">
                      6-Digit OTP Code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={handleOtpKeyDown}
                      className="w-full h-12 px-4 text-center tracking-[0.4em] font-mono text-lg text-primary border border-gray-300 rounded-lg outline-none bg-white focus:border-primary focus:ring-2 focus:ring-primary/10"
                      placeholder="000000"
                    />
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-slate-500 font-mono text-[11px] md:text-xs py-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Code expires in <strong className="font-bold text-primary">{formatCountdown(countdown)}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyLogin}
                    disabled={otpInput.length !== 6 || isSubmitting}
                    className="w-full h-11 bg-primary hover:bg-[#004395] text-white font-headline font-bold text-sm rounded-lg transition-all shadow-md hover:shadow-lg disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify Code'}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500">
                      Didn&apos;t receive the code?{' '}
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-primary hover:underline font-bold cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    </p>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setOtpInput('');
                        setPendingUserId(null);
                        resetMessages();
                      }}
                      className="text-xs text-slate-400 hover:text-primary transition-colors cursor-pointer underline"
                    >
                      Back to Credentials
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 1 && mode !== 'forgot-password' && (
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-slate-500">
                  {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                  <button
                    onClick={() => {
                      resetMessages();
                      const nextMode = mode === 'login' ? 'register' : 'login';
                      setMode(nextMode);
                      onNavigate(nextMode);
                    }}
                    className="text-primary font-bold hover:underline cursor-pointer"
                  >
                    {mode === 'login' ? 'Register' : 'Login'}
                  </button>
                </p>
              </div>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}