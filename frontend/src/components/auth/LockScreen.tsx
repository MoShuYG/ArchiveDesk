import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockClosedIcon, ArrowLeftOnRectangleIcon, UserIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../state/authStore';
import { cn } from '../../utils/cn';

export function LockScreen() {
  const navigate = useNavigate();
  const { session, isAuthenticated, isLocked, isLoading, error, unlock, logout, clearError } = useAuthStore();

  const [username, setUsername] = useState(session?.username ?? '');
  const [password, setPassword] = useState('');

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    if (!password) return;

    try {
      await unlock(password, username || undefined);
      navigate('/', { replace: true });
    } catch {
      // Error message handled in store.
    }
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isLocked) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 dark:brightness-75"
        style={{ backgroundImage: 'url(/assets/bg.png)' }}
      />
      {/* Dynamic Overlay for blending */}
      <div className="absolute inset-0 z-0 bg-background/40 backdrop-blur-[2px] transition-all duration-700 dark:bg-black/60" />

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/60 shadow-2xl backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-black/40">
        <div className="px-8 pb-6 pt-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
            <LockClosedIcon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">已锁定</h1>
          <p className="mt-2 text-sm text-foreground/70">请输入密码以继续访问资源库</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-6 px-8 py-8">
          <div className="space-y-2">
            <label htmlFor="unlock-username" className="text-sm font-medium text-foreground/80">
              用户名（可选）
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary">
                <UserIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />
              </div>
              <input
                id="unlock-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="默认使用当前会话用户名"
                autoComplete="username"
                className="w-full rounded-xl border border-white/30 bg-white/40 py-3 pl-12 pr-4 text-foreground shadow-inner transition-all focus:border-primary/50 focus:bg-white/60 focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-white/10 dark:bg-black/40 dark:focus:bg-black/60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="unlock-password" className="text-sm font-medium text-foreground/80">
              密码
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors group-focus-within:text-primary">
                <KeyIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />
              </div>
              <input
                id="unlock-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入登录密码"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-white/30 bg-white/40 py-3 pl-12 pr-4 text-foreground shadow-inner transition-all focus:border-primary/50 focus:bg-white/60 focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-white/10 dark:bg-black/40 dark:focus:bg-black/60"
              />
            </div>
          </div>

          {error && (
            <div className="animate-in slide-in-from-top-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive backdrop-blur-md">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex flex-[0.8] items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/20 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-white/30 dark:border-white/10 dark:bg-black/20 dark:hover:bg-black/40"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
              退出
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'flex-[1.2] rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]',
                isLoading && 'cursor-not-allowed opacity-70 hover:scale-100'
              )}
            >
              {isLoading ? '解锁中...' : '解锁并进入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
