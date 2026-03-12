import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes/routes';
import { useAuthStore } from './state/authStore';
import { useThemeStore } from './state/themeStore';

function App() {
  const checkSession = useAuthStore((s) => s.checkSession);
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <RouterProvider router={router} />;
}

export default App;
