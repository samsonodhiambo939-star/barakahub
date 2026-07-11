import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Finance from './pages/Finance';
import Services from './pages/Services';
import FollowUps from './pages/FollowUps';
import Groups from './pages/Groups';
import PortalLogin from './pages/PortalLogin';
import PortalLayout from './pages/PortalLayout';
import PortalDashboard from './pages/PortalDashboard';
import PortalGiving from './pages/PortalGiving';
import PortalProfile from './pages/PortalProfile';
import NotFound from './pages/NotFound';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PortalProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  if (!user) return <Navigate to="/portal/login" replace />;
  if (user.role !== 'member') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PortalPublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  if (user && user.role === 'member') return <Navigate to="/portal" replace />;
  if (user && user.role !== 'member') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/portal/login" element={<PortalPublicRoute><PortalLogin /></PortalPublicRoute>} />
          <Route path="/portal" element={<PortalProtectedRoute><PortalLayout /></PortalProtectedRoute>}>
            <Route index element={<PortalDashboard />} />
            <Route path="giving" element={<PortalGiving />} />
            <Route path="profile" element={<PortalProfile />} />
          </Route>
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="members" element={<Members />} />
            <Route path="finance" element={<Finance />} />
            <Route path="services" element={<Services />} />
            <Route path="followups" element={<FollowUps />} />
            <Route path="groups" element={<Groups />} />
          </Route>
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
