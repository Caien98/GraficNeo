import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Sparkles, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDbError(false);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
      } else if (mode === 'signup') {
        if (username.length < 3) {
          setError('Username must be at least 3 characters');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, username, displayName || username);
        if (error) setError(error);
        else setSuccess('Account created! You can now log in.');
        setMode('login');
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email);
        if (error) setError(error);
        else setSuccess('Password reset link sent to your email.');
      }
    } catch (err) {
      setDbError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-50 via-white to-accent-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="w-full max-w-md">
        {/* Dynamic Database Error Alert (renders at the very top when fetching fails) */}
        {dbError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100 animate-fade-in">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-relaxed">
                Error connecting to database. Please check your connection or try again later.
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand mb-4 shadow-lg shadow-brand-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight">GraficNeo</h1>
          <p className="text-gray-500 dark:text-neutral-400 mt-2">
            {mode === 'login' && 'Welcome back. Sign in to continue.'}
            {mode === 'signup' && 'Join the community. Create your account.'}
            {mode === 'forgot' && 'Reset your password.'}
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-800 p-6 sm:p-8 animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <InputField
                  icon={<User className="w-5 h-5" />}
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={setUsername}
                  required
                />
                <InputField
                  icon={<User className="w-5 h-5" />}
                  type="text"
                  placeholder="Display name (optional)"
                  value={displayName}
                  onChange={setDisplayName}
                />
              </>
            )}
            <InputField
              icon={<Mail className="w-5 h-5" />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              required
            />
            {mode !== 'forgot' && (
              <InputField
                icon={<Lock className="w-5 h-5" />}
                type="password"
                placeholder="Password"
                value={password}
                onChange={setPassword}
                required
              />
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-950/30 rounded-lg p-3 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950/30 rounded-lg p-3 animate-fade-in">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-brand text-white font-semibold shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-neutral-400">
            {mode === 'login' && (
              <>
                <button onClick={() => { setMode('forgot'); setError(null); setDbError(false); }} className="hover:text-brand-600 transition-colors">
                  Forgot password?
                </button>
                <div className="mt-3">
                  Don't have an account?{' '}
                  <button onClick={() => { setMode('signup'); setError(null); setDbError(false); }} className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                    Sign up
                  </button>
                </div>
              </>
            )}
            {mode === 'signup' && (
              <div>
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(null); setDbError(false); }} className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                  Sign in
                </button>
              </div>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('login'); setError(null); setDbError(false); }} className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-neutral-600 mt-6">
          By continuing, you agree to GraficNeo's Terms & Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function InputField({
  icon,
  type,
  placeholder,
  value,
  onChange,
  required,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
      />
    </div>
  );
}