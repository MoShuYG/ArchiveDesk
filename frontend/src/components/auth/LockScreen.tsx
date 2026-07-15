import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArchiveBoxIcon, LockClosedIcon, ArrowLeftOnRectangleIcon, UserIcon, KeyIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../state/authStore';
import { useI18n } from '../../hooks/useI18n';
import { cn } from '../../utils/cn';
import { LanguageToggle } from '../common/LanguageToggle';

export function LockScreen() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLocked = useAuthStore((s) => s.isLocked);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);
  const { t, localizeError } = useI18n();

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
    <div className="relative min-h-dvh overflow-hidden bg-slate-950">
      <LanguageToggle className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{ backgroundImage: 'url(/assets/bg.png)' }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-950/72 backdrop-blur-[1px]" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-12">
        <section className="hidden max-w-2xl text-white lg:block" aria-label={t('lock.intro')}>
          <div className="mb-9 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/40">
              <ArchiveBoxIcon className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold tracking-tight">ArchiveDesk</span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">{t('lock.sessionProtection')}</p>
          <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">{t('lock.heroTitle')}</h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{t('lock.heroDescription')}</p>
        </section>

        <main className="app-surface w-full max-w-md justify-self-center overflow-hidden bg-card/95 shadow-2xl shadow-slate-950/35 backdrop-blur-md">
          <div className="px-6 pb-5 pt-7 text-center sm:px-8 sm:pt-9">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <LockClosedIcon className="h-6 w-6" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">ArchiveDesk</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('lock.title')}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('lock.description')}</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-5 px-6 pb-7 sm:px-8 sm:pb-9">
            <div className="space-y-1.5">
              <label htmlFor="unlock-username" className="text-sm font-medium text-foreground">
                {t('auth.usernameOptional')}
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground transition-colors group-focus-within:text-primary">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  id="unlock-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t('lock.currentUsernamePlaceholder')}
                  autoComplete="username"
                  className="app-control min-h-11 w-full pl-11 pr-3"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="unlock-password" className="text-sm font-medium text-foreground">
                {t('auth.password')}
              </label>
              <div className="group relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground transition-colors group-focus-within:text-primary">
                  <KeyIcon className="h-5 w-5" />
                </div>
                <input
                  id="unlock-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('lock.passwordPlaceholder')}
                  autoComplete="current-password"
                  required
                  className="app-control min-h-11 w-full pl-11 pr-3"
                />
              </div>
            </div>

            {error ? (
              <div className="app-alert-error" role="alert" aria-live="polite">
                {localizeError(error.value, error.fallbackKey)}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => void logout()} className="app-button-secondary min-h-11 px-3">
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                {t('session.logout')}
              </button>

              <button type="submit" disabled={isLoading} className={cn('app-button-primary min-h-11 px-3', isLoading && 'cursor-not-allowed')}>
                {isLoading ? t('lock.unlocking') : t('lock.unlock')}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
