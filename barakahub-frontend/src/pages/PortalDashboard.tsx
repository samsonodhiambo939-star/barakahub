import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { DollarSign, Church, Users, Calendar, Phone, ArrowRight, Gift } from 'lucide-react';

interface PortalDashboard {
  givingYtd: number;
  givingCount: number;
  lastGift: { amount: number; date: string; category: string } | null;
  attendance: { total: number; quarterly: number; quarterStart: string; lastFive: { id: number; date: string; service: string }[] };
  group: { id: number; name: string; type: string; meetingDay: string | null; meetingTime: string | null; location: string | null; leader: { id: number; firstName: string; lastName: string; phone: string } | null } | null;
  nextService: { id: number; name: string; date: string; type: string } | null;
  recentActivity: { type: string; amount: number; date: string; category: string }[];
}

function formatCurrency(v: number) { return `KSh ${v.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`; }
function formatDate(d: string) { return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }); }

export default function PortalDashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: () => api.get('/portal/dashboard').then(r => r.data as PortalDashboard),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-xl shadow-sm" />)}
      </div>
    );
  }

  const d = data;

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Giving YTD */}
        <button onClick={() => navigate('/portal/giving')} className="bg-white rounded-xl shadow-sm p-4 text-left">
          <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center mb-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{d ? formatCurrency(d.givingYtd) : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Giving YTD</p>
          {d?.lastGift && (
            <p className="text-[10px] text-gray-400 mt-1">Last: {formatCurrency(d.lastGift.amount)} on {formatDate(d.lastGift.date)}</p>
          )}
        </button>

        {/* Attendance */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
            <Church className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{d?.attendance.quarterly || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">Services This Quarter</p>
        </div>

        {/* My Group */}
        <button onClick={() => navigate('/portal/profile')} className="bg-white rounded-xl shadow-sm p-4 text-left">
          <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          {d?.group ? (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate">{d.group.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {d.group.meetingDay} {d.group.meetingTime}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-400">No Group</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Join a cell group</p>
            </>
          )}
        </button>

        {/* Next Service */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          {d?.nextService ? (
            <>
              <p className="text-xs font-semibold text-gray-900">{d.nextService.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(d.nextService.date)}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-400">No upcoming</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Check back later</p>
            </>
          )}
        </div>
      </div>

      {/* Group Leader Contact */}
      {d?.group?.leader && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Group Leader</p>
              <p className="text-sm font-medium text-gray-800">{d.group.leader.firstName} {d.group.leader.lastName}</p>
            </div>
            <a href={`tel:${d.group.leader.phone}`} className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
              <Phone className="w-4 h-4" /> Call
            </a>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Activity</h3>
        {d && d.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {d.recentActivity.slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-7 h-7 bg-emerald-50 rounded-full flex items-center justify-center">
                  <Gift className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-700 truncate">You gave {formatCurrency(a.amount)}</p>
                  <p className="text-xs text-gray-400">{a.category} · {formatDate(a.date)}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
        )}
      </div>
    </div>
  );
}
