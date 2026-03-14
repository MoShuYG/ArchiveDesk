import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRightOnRectangleIcon, Bars3Icon, ComputerDesktopIcon, LockClosedIcon, MoonIcon, SunIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../state/authStore';
import { useThemeStore } from '../../state/themeStore';
import { cn } from '../../utils/cn';

const NAV_LINKS = [
  { name: '资源管理器', path: '/' },
  { name: '搜索', path: '/search' },
  { name: '资源库管理', path: '/library' },
  { name: '历史记录', path: '/history' },
];

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans transition-colors duration-200">
      <Header />
      <main className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
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
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function isLinkActive(linkPath: string): boolean {
    if (linkPath === '/') {
      return location.pathname === '/';
    }
    return location.pathname === linkPath || location.pathname.startsWith(`${linkPath}/`);
  }

  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 transition-all duration-300">
      <div className="flex h-16 items-center justify-between rounded-2xl border border-white/20 bg-background/70 px-6 shadow-lg shadow-black/5 backdrop-blur-xl transition-all dark:border-white/10 dark:bg-black/50 dark:shadow-black/40">
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 font-bold text-primary-foreground shadow-md shadow-primary/30 transition-all group-hover:scale-105 group-hover:shadow-primary/40 group-active:scale-95">
              A
            </div>
            <span className="hidden text-xl font-bold tracking-tight sm:block bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">ArchiveDesk</span>
          </Link>

          <nav className="hidden gap-6 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'relative py-2 text-sm font-semibold transition-all duration-300',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {link.name}
                  {isActive ? (
                    <span className="absolute -bottom-[21px] left-0 h-[3px] w-full rounded-t-full bg-primary shadow-[0_-2px_8px_rgba(59,130,246,0.6)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          {session ? <div className="h-6 w-px bg-border/50" /> : null}
          {session ? (
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border/50 bg-secondary/50 px-3 py-1 text-sm font-medium text-foreground shadow-sm backdrop-blur-md">
                {session.username}
              </span>
              <button onClick={() => void lock()} className="rounded-full bg-secondary/30 p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-primary hover:shadow-sm" title="锁屏">
                <LockClosedIcon className="h-5 w-5" />
              </button>
              <button onClick={() => void logout()} className="rounded-full bg-secondary/30 p-2 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive hover:shadow-sm" title="退出登录">
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="rounded-xl bg-secondary/50 p-2 text-foreground transition-colors hover:bg-secondary"
            aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
          >
            {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="space-y-4 border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {session ? (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <div className="px-4 py-2 text-sm text-muted-foreground">
                当前用户: <span className="font-semibold text-foreground">{session.username}</span>
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
                  锁屏
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void logout();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 font-medium text-destructive transition-colors hover:bg-destructive/20"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  退出
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
  return (
    <div className="flex items-center rounded-full border border-border bg-secondary/50 p-1">
      <button
        onClick={() => setTheme('light')}
        className={cn('rounded-full p-1.5 transition-all', theme === 'light' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        title="浅色模式"
      >
        <SunIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn('rounded-full p-1.5 transition-all', theme === 'system' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        title="跟随系统"
      >
        <ComputerDesktopIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn('rounded-full p-1.5 transition-all', theme === 'dark' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        title="深色模式"
      >
        <MoonIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto py-8">
      <div className="mx-auto flex max-w-[1800px] flex-col items-center justify-between gap-4 px-4 text-sm text-foreground/40 sm:flex-row sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} ArchiveDesk</p>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
          <span>服务运行中</span>
        </div>
      </div>
    </footer>
  );
}

