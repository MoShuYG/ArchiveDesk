import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../state/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const isLocked = useAuthStore((s) => s.isLocked);
    const isLoading = useAuthStore((s) => s.isLoading);

    if (isLoading) {
        return <div>加载中...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (isLocked) {
        return <Navigate to="/lock" replace />;
    }

    return <>{children}</>;
}
