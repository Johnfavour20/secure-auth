import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { resetPassword } from '../api/auth';

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

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const email = (params.get('email') || '').trim().toLowerCase();
  const token = (params.get('token') || '').trim();

  useEffect(() => {
    if (!email || !token) {
      setError('This password reset link is invalid or missing required details.');
    }
  }, [email, token]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !token) {
      setError('This password reset link is invalid or missing required details.');
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
      const response = await resetPassword(email, token, password);
      setSuccess(response.data.message ?? 'Password reset successfully. You can now log in with your new password.');
      setPassword('');
      setConfirmPassword('');
      window.setTimeout(() => navigate('/login'), 1500);
    } catch (resetError: any) {
      console.error(resetError);
      setError(resetError?.response?.data?.error ?? 'Unable to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = useMemo(() => checkPasswordStrength(password), [password]);

  return (
    <div className="min-h-screen bg-surface-light flex items-center justify-center px-6 py-12 text-primary">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-slate-50">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-headline text-2xl font-bold text-primary">Create a New Password</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a strong password you have not used before.</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-600">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500" htmlFor="new-password">New Password</label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-primary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500" htmlFor="confirm-password">Confirm New Password</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-primary"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Strength</span>
              <span className="font-bold text-primary">{strength.label}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
              <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${Math.min(100, (strength.entropy / 80) * 100)}%` }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-headline font-bold text-sm text-white shadow-md transition-all hover:bg-[#004395] disabled:opacity-60"
          >
            {isSubmitting ? 'Updating...' : 'Reset Password'}
            {!isSubmitting && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
