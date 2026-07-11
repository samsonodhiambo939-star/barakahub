import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LogOut, Home, Users, DollarSign, Church, UserCheck, LayoutGrid, Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import Ticker from './Ticker';
import toast from 'react-hot-toast';

function Breadcrumbs() {
  const location = useLocation();
  const paths = location.pathname.split('/').filter(Boolean);

  if (paths.length === 0) return null;

  const labels: Record<string, string> = {
    members: 'Members',
    finance: 'Finance',
    services: 'Services',
    followups: 'Follow-ups',
    groups: 'Groups',
    dashboard: 'Dashboard',
  };

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-400 mb-0" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-emerald-600 transition-colors">Dashboard</Link>
      {paths.map((p, i) => {
        const label = labels[p] || p.charAt(0).toUpperCase() + p.slice(1);
        return (
          <span key={p} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            {i === paths.length - 1 ? (
              <span className="text-gray-600 font-medium">{label}</span>
            ) : (
              <Link to={`/${paths.slice(0, i + 1).join('/')}`} className="hover:text-emerald-600 transition-colors">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home, roles: ['member', 'usher', 'leader', 'pastor', 'admin', 'secretary'] },
    { to: '/members', label: 'Members', icon: Users, roles: ['admin', 'pastor', 'leader'] },
    { to: '/finance', label: 'Finance', icon: DollarSign, roles: ['admin', 'pastor'] },
    { to: '/services', label: 'Services', icon: Church, roles: ['admin', 'pastor', 'usher', 'leader'] },
    { to: '/followups', label: 'Follow-ups', icon: UserCheck, roles: ['admin', 'pastor', 'leader', 'secretary'] },
    { to: '/groups', label: 'Groups', icon: LayoutGrid, roles: ['admin', 'pastor', 'leader', 'secretary'] },
  ];

  const visibleNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="BarakaHub" className="w-8 h-8 rounded-lg object-cover" />
              <h1 className="text-xl font-bold text-emerald-700">BarakaHub</h1>
            </div>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          {user && <p className="text-sm text-gray-500 mt-1">{user.firstName} {user.lastName}</p>}
        </div>

        <nav className="p-4 space-y-1">
          {visibleNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Ticker */}
        <Ticker />

        <header className="bg-white shadow-sm p-4 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BarakaHub" className="w-6 h-6 rounded object-cover" />
            <h1 className="text-lg font-bold text-emerald-700">BarakaHub</h1>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Breadcrumbs />
          <div className="mt-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
