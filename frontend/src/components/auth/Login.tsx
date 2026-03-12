import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightEndOnRectangleIcon,
  KeyIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../state/authStore';
import { cn } from '../../utils/cn';
import { validatePassword } from '../../utils/validation';

export function Login() {
  const navigate = useNavigate();
  const { login, setupPassword, isLoading, error, needsSetup, clearError } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(false);

  const showSetup = needsSetup || isSetupMode;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setValidationError('');

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setValidationError(passwordValidation.message);
      return;
    }

    if (showSetup && password !== confirmPassword) {
      setValidationError('两次输入的密码不一致');
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
      // Error message is already handled in the store.
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 dark:brightness-75"
        style={{ backgroundImage: 'url(/assets/bg.png)' }}
      />
      <div className="absolute inset-0 z-0 bg-background/40 backdrop-blur-[2px] transition-all duration-700 dark:bg-black/60" />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/60 shadow-2xl backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-black/40">
        <div className="px-8 pb-6 pt-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
            <KeyIcon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {showSetup ? '初始化 ArchiveDesk' : '欢迎使用 ArchiveDesk'}
          </h1>
          <p className="mt-2 text-sm text-foreground/70">
            {showSetup ? '首次使用请先设置密码以保护 ArchiveDesk。' : '输入密码登录 ArchiveDesk。'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 py-6">
          <div className="space-y-4">
            <InputField
              id="login-username"
              label="用户名（可选）"
              value={username}
              onChange={setUsername}
              placeholder="默认：local"
              autoComplete="username"
              icon={<UserIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />}
            />

            <InputField
              id="login-password"
              label="密码"
              value={password}
              onChange={setPassword}
              placeholder="请输入密码"
              type="password"
              autoComplete={showSetup ? 'new-password' : 'current-password'}
              required
              icon={<KeyIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />}
            />

            {showSetup ? (
              <InputField
                id="login-confirm-password"
                label="确认密码"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="再次输入密码"
                type="password"
                autoComplete="new-password"
                required
                icon={<KeyIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary" />}
              />
            ) : null}
          </div>

          {validationError || error ? (
            <div className="animate-in slide-in-from-top-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive backdrop-blur-md">
              {validationError || error}
            </div>
          ) : null}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]',
                isLoading && 'cursor-not-allowed opacity-70 hover:scale-100'
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin text-primary-foreground" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  处理中...
                </span>
              ) : (
                <>
                  {showSetup ? '设置并登录' : '登录'}
                  <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>

        {!needsSetup ? (
          <div className="border-t border-white/20 bg-background/20 px-8 pb-8 pt-6 text-center dark:border-white/5 dark:bg-black/20">
            <button
              type="button"
              onClick={() => {
                setIsSetupMode((v) => !v);
                setValidationError('');
                clearError();
              }}
              className="text-sm font-medium text-foreground/60 transition-colors hover:text-primary hover:underline"
            >
              {isSetupMode ? '返回登录' : '首次使用？设置密码'}
            </button>
          </div>
        ) : null}
      </div>
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
    <div className="space-y-2">
      <label htmlFor={id} className="pl-1 text-sm font-medium text-foreground/80">
        {label}
      </label>
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors">
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
          className="w-full rounded-xl border border-white/30 bg-white/40 py-3 pl-12 pr-4 text-foreground shadow-inner transition-all focus:border-primary/50 focus:bg-white/60 focus:outline-none focus:ring-4 focus:ring-primary/20 dark:border-white/10 dark:bg-black/40 dark:focus:bg-black/60"
        />
      </div>
    </div>
  );
}