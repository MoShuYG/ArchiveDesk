import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArchiveBoxIcon,
  ArrowRightEndOnRectangleIcon,
  CircleStackIcon,
  EyeIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../state/authStore';
import { useI18n } from '../../hooks/useI18n';
import { cn } from '../../utils/cn';
import { validatePassword } from '../../utils/validation';
import { LanguageToggle } from '../common/LanguageToggle';
import type { MessageKey } from '../../i18n';

export function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setupPassword = useAuthStore((s) => s.setupPassword);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const needsSetup = useAuthStore((s) => s.needsSetup);
  const clearError = useAuthStore((s) => s.clearError);
  const { t, localizeError } = useI18n();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<MessageKey | null>(null);
  const [isSetupMode, setIsSetupMode] = useState(false);

  const showSetup = needsSetup || isSetupMode;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setValidationError(null);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setValidationError(passwordValidation.messageKey);
      return;
    }

    if (showSetup && password !== confirmPassword) {
      setValidationError('auth.passwordMismatch');
      return;
    }

    try {
      if (showSetup) {
        await setupPassword(password, username || undefined);
      } else {
        await login(password, username || undefined);
      }
      navigate('/', { replace: true });
    } catch {
      // The store retains the structured error for locale-aware rendering.
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-slate-950">
      <LanguageToggle className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6" />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
        style={{ backgroundImage: 'url(/assets/bg.png)' }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-slate-950/60" aria-hidden="true" />

      <div className="relative z-10 mx-auto grid min-h-dvh w-full max-w-7xl items-center gap-12 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-12">
        <section className="hidden max-w-2xl text-white lg:block" aria-label={t('auth.productIntro')}>
          <div className="mb-10 inline-flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/40">
              <ArchiveBoxIcon className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold tracking-tight">ArchiveDesk</span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-200">{t('auth.workspaceLabel')}</p>
          <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            {t('auth.heroTitle')}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
            {t('auth.heroDescription')}
          </p>
          <div className="mt-9 grid max-w-xl gap-5 sm:grid-cols-3">
            <Feature icon={<CircleStackIcon className="h-5 w-5" />} title={t('auth.featureManage')} />
            <Feature icon={<MagnifyingGlassIcon className="h-5 w-5" />} title={t('auth.featureSearch')} />
            <Feature icon={<EyeIcon className="h-5 w-5" />} title={t('auth.featurePreview')} />
          </div>
        </section>

        <main className="app-surface w-full max-w-md justify-self-center overflow-hidden bg-card/95 shadow-2xl shadow-slate-950/35 backdrop-blur-md">
          <div className="px-6 pb-4 pt-7 sm:px-8 sm:pt-8">
            <div className="mb-7 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <ArchiveBoxIcon className="h-5 w-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-foreground">ArchiveDesk</span>
            </div>
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyIcon className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {showSetup ? t('auth.initializeTitle') : t('auth.welcomeTitle')}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {showSetup ? t('auth.initializeDescription') : t('auth.welcomeDescription')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-7 pt-4 sm:px-8">
            <div className="space-y-4">
              <InputField
                id="login-username"
                label={t('auth.usernameOptional')}
                value={username}
                onChange={setUsername}
                placeholder={t('auth.defaultUsername')}
                autoComplete="username"
                icon={<UserIcon className="h-5 w-5" />}
              />

              <InputField
                id="login-password"
                label={t('auth.password')}
                value={password}
                onChange={setPassword}
                placeholder={t('auth.passwordPlaceholder')}
                type="password"
                autoComplete={showSetup ? 'new-password' : 'current-password'}
                required
                icon={<KeyIcon className="h-5 w-5" />}
              />

              {showSetup ? (
                <InputField
                  id="login-confirm-password"
                  label={t('auth.confirmPassword')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  type="password"
                  autoComplete="new-password"
                  required
                  icon={<KeyIcon className="h-5 w-5" />}
                />
              ) : null}
            </div>

            {validationError || error ? (
              <div className="app-alert-error" role="alert" aria-live="polite">
                {validationError ? t(validationError) : error ? localizeError(error.value, error.fallbackKey) : ''}
              </div>
            ) : null}

            <button type="submit" disabled={isLoading} className={cn('app-button-primary min-h-11 w-full', isLoading && 'cursor-not-allowed')}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-primary-foreground" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  {t('auth.processing')}
                </span>
              ) : (
                <>
                  {showSetup ? t('auth.setupAndSignIn') : t('auth.signIn')}
                  <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {!needsSetup ? (
            <div className="border-t border-border bg-secondary/35 px-6 py-4 text-center sm:px-8">
              <button
                type="button"
                onClick={() => {
                  setIsSetupMode((v) => !v);
                  setValidationError(null);
                  clearError();
                }}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {isSetupMode ? t('auth.backToSignIn') : t('auth.firstUseSetup')}
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function Feature({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-l border-white/20 pl-3 text-sm font-medium text-slate-100">
      <span className="text-blue-300">{icon}</span>
      {title}
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
  required,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  icon: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground transition-colors group-focus-within:text-primary">
          {icon}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="app-control min-h-11 w-full pl-11 pr-3"
        />
      </div>
    </div>
  );
}
