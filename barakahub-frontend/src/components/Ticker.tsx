import { useAuth } from '../lib/auth';

export default function Ticker() {
  const { user } = useAuth();
  if (!user) return null;

  const roleLabel = user.role === 'member' ? 'Member' :
    user.role === 'admin' ? 'Administrator' :
    user.role === 'pastor' ? 'Pastor' :
    user.role === 'leader' ? 'Leader' :
    user.role === 'usher' ? 'Usher' : user.role;

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-white text-sm py-1.5 overflow-hidden border-b border-emerald-600 shadow-inner">
      <div className="whitespace-nowrap inline-block animate-marquee">
        <span className="inline-flex items-center gap-2 mx-4">
          <img src="/logo.png" alt="BarakaHub" className="w-5 h-5 rounded-full object-cover inline-block" />
          <span className="font-bold tracking-wide">BARAKAHUB</span>
          <span className="text-emerald-300 mx-2">✦</span>
          <span>Welcome to BarakaHub Church — <strong>{fullName}</strong> ({roleLabel})</span>
          <span className="text-emerald-300 mx-2">✦</span>
          <span>Thank you and God bless you!</span>
          <span className="text-emerald-300 mx-2">✦</span>
          <span className="text-emerald-200 text-xs">Today is {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </span>
        {/* Duplicate for seamless loop */}
        <span className="inline-flex items-center gap-2 mx-4">
          <img src="/logo.png" alt="BarakaHub" className="w-5 h-5 rounded-full object-cover inline-block" />
          <span className="font-bold tracking-wide">BARAKAHUB</span>
          <span className="text-emerald-300 mx-2">✦</span>
          <span>Welcome to BarakaHub Church — <strong>{fullName}</strong> ({roleLabel})</span>
          <span className="text-emerald-300 mx-2">✦</span>
          <span>Thank you and God bless you!</span>
          <span className="text-emerald-300 mx-2">✦</span>
          <span className="text-emerald-200 text-xs">Today is {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </span>
      </div>
    </div>
  );
}