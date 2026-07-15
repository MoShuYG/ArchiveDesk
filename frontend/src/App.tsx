import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/routes';
import { useAuthStore } from './state/authStore';
import { useLanguageStore } from './state/languageStore';
import { useThemeStore } from './state/themeStore';

function App() {
  const checkSession = useAuthStore((s) => s.checkSession);
  const initLanguage = useLanguageStore((s) => s.initLanguage);
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initLanguage();
    initTheme();
    checkSession();
  }, [checkSession, initLanguage, initTheme]);

  return <RouterProvider router={router} />;
}

export default App;
