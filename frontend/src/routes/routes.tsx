import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '../components/auth/Login';
import { LockScreen } from '../components/auth/LockScreen';
import { HomePage } from '../pages/HomePage';
import { ExplorerPage } from '../pages/ExplorerPage';
import { LibraryManagePage } from '../pages/LibraryManagePage';
import { ItemDetailPage } from '../pages/ItemDetailPage';
import { HistoryPage } from '../pages/HistoryPage';
import { AppLayout } from '../components/common/AppLayout';

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/lock',
        element: <LockScreen />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <AppLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <ExplorerPage />,
            },
            {
                path: 'search',
                element: <HomePage />,
            },
            {
                path: 'library',
                element: <LibraryManagePage />,
            },
            {
                path: 'items/:id',
                element: <ItemDetailPage />,
            },
            {
                path: 'history',
                element: <HistoryPage />,
            },
        ],
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
