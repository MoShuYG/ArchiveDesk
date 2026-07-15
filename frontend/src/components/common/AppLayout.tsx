import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  CircleStackIcon,
  ClockIcon,
  ComputerDesktopIcon,
  FolderOpenIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../state/authStore';
import { useThemeStore } from '../../state/themeStore';
import { useI18n } from '../../hooks/useI18n';
import type { MessageKey } from '../../i18n';
import { cn } from '../../utils/cn';
import { LanguageToggle } from './LanguageToggle';

const NAV_LINKS = [
  { labelKey: 'nav.explorer', path: '/', icon: FolderOpenIcon },
  { labelKey: 'nav.search', path: '/search', icon: MagnifyingGlassIcon },
  { labelKey: 'nav.library', path: '/library', icon: CircleStackIcon },
  { labelKey: 'nav.history', path: '/history', icon: ClockIcon },
] satisfies Array<{ labelKey: MessageKey; path: string; icon: typeof FolderOpenIcon }>;

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col font-sans">
      <Header />
      <main className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const session = useAuthStore((s) => s.session);
  const lock = useAuthStore((s) => s.lock);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const { t } = useI18n();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isLinkActive(linkPath: string): boolean {
    if (linkPath === '/') {
      return location.pathname === '/';
    }
    return location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-5 lg:gap-8">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5" aria-label={t('nav.homeLabel')}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-active:scale-95">
              <ArchiveBoxIcon className="h-5 w-5" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-foreground min-[420px]:block">ArchiveDesk</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.main')}>
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(link.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageToggle />
          <ThemeToggle theme={theme} setTheme={setTheme} />
          {session ? <div className="h-6 w-px bg-border" /> : null}
          {session ? (
            <div className="flex items-center gap-1">
              <span className="mr-1 inline-flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm font-medium text-foreground">
                <UserCircleIcon className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-28 truncate">{session.username}</span>
              </span>
              <button onClick={() => void lock()} className="app-icon-button" title={t('session.lock')} aria-label={t('session.lock')}>
                <LockClosedIcon className="h-[18px] w-[18px]" />
              </button>
              <button onClick={() => void logout()} className="app-icon-button hover:bg-destructive/10 hover:text-destructive" title={t('session.logout')} aria-label={t('session.logout')}>
                <ArrowRightOnRectangleIcon className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LanguageToggle />
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="app-icon-button"
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div id="mobile-navigation" className="space-y-4 border-t border-border bg-background px-4 py-4 shadow-lg lg:hidden">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.path);
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {t(link.labelKey)}
                </Link>
              );
            })}
          </nav>

          {session ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <div className="px-4 py-2 text-sm text-muted-foreground">
                {t('session.currentUser', { username: session.username })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void lock();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                  <LockClosedIcon className="h-4 w-4" />
                  {t('session.lock')}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void logout();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  {t('session.exit')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: 'light' | 'dark' | 'system'; setTheme: (theme: 'light' | 'dark' | 'system') => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm" role="group" aria-label={t('theme.group')}>
      <button
        onClick={() => setTheme('light')}
        className={cn('rounded-md p-1.5 transition-colors', theme === 'light' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
        title={t('theme.light')}
        aria-label={t('theme.light')}
        aria-pressed={theme === 'light'}
      >
        <SunIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn('rounded-md p-1.5 transition-colors', theme === 'system' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
        title={t('theme.system')}
        aria-label={t('theme.system')}
        aria-pressed={theme === 'system'}
      >
        <ComputerDesktopIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn('rounded-md p-1.5 transition-colors', theme === 'dark' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
        title={t('theme.dark')}
        aria-label={t('theme.dark')}
        aria-pressed={theme === 'dark'}
      >
        <MoonIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-auto border-t border-border/70 py-5">
      <div className="mx-auto flex max-w-[1680px] flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} ArchiveDesk</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{t('footer.serviceRunning')}</span>
        </div>
      </div>
    </footer>
  );
}

