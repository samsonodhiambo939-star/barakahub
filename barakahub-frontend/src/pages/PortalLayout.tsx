import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Home, DollarSign, User, ArrowLeft, LogOut } from 'lucide-react';

const navItems = [
  { to: '/portal', label: 'Home', icon: Home },
  { to: '/portal/giving', label: 'My Giving', icon: DollarSign },
  { to: '/portal/profile', label: 'Profile', icon: User },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <header className="bg-emerald-700 text-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {location.pathname !== '/portal' && (
              <button onClick={() => navigate('/portal')} className="p-1 hover:bg-emerald-600 rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="font-bold text-sm">BarakaHub</h1>
              <p className="text-[10px] text-emerald-200">Member Portal</p>
            </div>
          </div>
          {user && (
            <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-emerald-200 hover:text-white">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          )}
        </div>
        {user && (
          <div className="mt-1">
            <p className="text-sm font-medium">Hi, {user.firstName}</p>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t flex z-10">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex-1 flex flex-col items-center py-2 text-xs ${
              isActive(item.to) ? 'text-emerald-700 font-medium' : 'text-gray-400'
            }`}
          >
            <item.icon className="w-5 h-5 mb-0.5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
