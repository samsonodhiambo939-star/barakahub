import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import {
  Users, DollarSign, Church, UserCheck, AlertTriangle,
  Phone, Calendar, ArrowRight, Wallet,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface ClosedService {
  id: number; name: string; date: string;
  totalAttendance: number; totalOffering: number;
  status: string;
  _count: { attendances: number };
}
interface FollowUpStats { pending: number; inProgress?: number; completedThisWeek: number; overdue: number; total: number; }
interface FollowUpTask {
  id: number; title: string; trigger: string; status: string; dueDate: string | null;
  assignedUser: { firstName: string; lastName: string };
  relatedUser?: { firstName: string; lastName: string; phone: string; id: number };
}
interface Transaction {
  id: number; receiptNo: string | null; amount: number; paymentMethod: string;
  transactionDate: string;
  user?: { firstName: string; lastName: string };
  category: { name: string };
}

function formatCurrency(v: number) { return `KSh ${v.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`; }
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-28 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-36" />
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 28; const w = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isPastorAdmin = user?.role === 'admin' || user?.role === 'pastor';
  const isSecretary = user?.role === 'secretary';
  const isLeader = user?.role === 'leader';
  const canViewAll = isPastorAdmin;
  const canViewFinance = isPastorAdmin || isSecretary;
  const canViewFollowups = isPastorAdmin || isLeader;

  const servicesQ = useQuery({
    queryKey: ['dashboard', 'services-closed'],
    queryFn: () => api.get('/services?status=closed&limit=12').then(r => r.data.data as ClosedService[]),
    staleTime: 60_000,
  });
  const activeMembersQ = useQuery({
    queryKey: ['dashboard', 'members-active'],
    queryFn: () => api.get('/members?status=active&limit=1').then(r => r.data.pagination?.total || 0),
    staleTime: 60_000,
  });
  const inactiveMembersQ = useQuery({
    queryKey: ['dashboard', 'members-inactive'],
    queryFn: () => api.get('/members?status=inactive&limit=1').then(r => r.data.pagination?.total || 0),
    staleTime: 60_000,
  });
  const totalMembersQ = useQuery({
    queryKey: ['dashboard', 'members-total'],
    queryFn: () => api.get('/members?limit=1').then(r => r.data.pagination?.total || 0),
    staleTime: 60_000,
  });
  const followupStatsQ = useQuery({
    queryKey: ['dashboard', 'followup-stats'],
    queryFn: () => api.get('/followups/stats').then(r => r.data as FollowUpStats),
    staleTime: 60_000,
  });
  const followupTasksQ = useQuery({
    queryKey: ['dashboard', 'followup-tasks'],
    queryFn: () => api.get('/followups?limit=5').then(r => r.data.data as FollowUpTask[]),
    staleTime: 60_000,
  });
  const recentTxQ = useQuery({
    queryKey: ['dashboard', 'recent-tx'],
    queryFn: () => api.get('/finance/transactions?limit=5').then(r => r.data.data as Transaction[]),
    staleTime: 60_000,
  });

  const services = servicesQ.data || [];
  const lastService = services[0];
  const prevService = services[1];
  const isLoading = servicesQ.isLoading || activeMembersQ.isLoading || followupStatsQ.isLoading;
  const hasMembers = (totalMembersQ.data || 0) > 0;
  const hasServiceData = services.length > 0;
  const hasTransactions = (recentTxQ.data || []).length > 0;
  const hasFollowups = (followupStatsQ.data?.total || 0) > 0;
  const trulyEmpty = !isLoading && !hasServiceData && !hasMembers && !hasTransactions && !hasFollowups;

  const attendanceChange = lastService && prevService
    ? ((lastService.totalAttendance - prevService.totalAttendance) / prevService.totalAttendance * 100).toFixed(1)
    : null;
  const offeringChange = lastService && prevService
    ? ((lastService.totalOffering - prevService.totalOffering) / prevService.totalOffering * 100).toFixed(1)
    : null;

  const chartData = [...services].reverse().map(s => ({
    week: formatDateShort(s.date),
    attendance: s.totalAttendance || s._count?.attendances || 0,
    offering: s.totalOffering,
  }));

  const attSparkline = services.slice(0, 8).reverse().map(s => s.totalAttendance || s._count?.attendances || 0);

  const followupStats = followupStatsQ.data || { pending: 0, overdue: 0, completedThisWeek: 0, total: 0 };
  const activeCount = activeMembersQ.data || 0;
  const inactiveCount = inactiveMembersQ.data || 0;
  const totalMembers = totalMembersQ.data || 0;
  const visitorCount = totalMembers - activeCount - inactiveCount;

  if (user && !['admin', 'pastor', 'leader', 'secretary'].includes(user.role)) {
    navigate('/members', { replace: true });
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasServiceData && lastService
              ? `Last service: ${lastService.name} — ${formatDate(lastService.date)}`
              : `Welcome, ${user?.firstName}`}
          </p>
        </div>
      </div>

      {trulyEmpty ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Church className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Welcome to BarakaHub</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Record your first service to see insights, attendance trends, and giving summaries.
          </p>
        </div>
      ) : isLoading && !hasServiceData && !hasMembers ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* ─── ROW 1: KPI CARDS ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {/* Card 1: Last Sunday Attendance */}
            <button onClick={() => navigate('/services')} className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Church className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Attendance</span>
              </div>
              {lastService ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-gray-900">{lastService.totalAttendance || lastService._count?.attendances || 0}</span>
                    <Sparkline data={attSparkline} />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {attendanceChange !== null && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${+attendanceChange >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                        {+attendanceChange >= 0 ? '+' : ''}{attendanceChange}%
                      </span>
                    )}
                    <span className="text-xs text-gray-400">vs prev week</span>
                  </div>
                </>
              ) : (
                <span className="text-3xl font-bold text-gray-300">—</span>
              )}
            </button>

            {/* Card 2: Last Sunday Offering */}
            <button onClick={() => navigate('/finance?date=last_sunday')} className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Offering</span>
              </div>
              {lastService ? (
                <>
                  <span className="text-3xl font-bold text-gray-900">{formatCurrency(lastService.totalOffering)}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    {offeringChange !== null && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${+offeringChange >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                        {+offeringChange >= 0 ? '+' : ''}{offeringChange}%
                      </span>
                    )}
                    <span className="text-xs text-gray-400">vs prev week</span>
                  </div>
                </>
              ) : (
                <span className="text-3xl font-bold text-gray-300">—</span>
              )}
            </button>

            {/* Card 3: Active Members */}
            <button onClick={() => navigate('/members?status=active')} className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Members</span>
              </div>
              <span className="text-3xl font-bold text-gray-900">{totalMembers.toLocaleString()}</span>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                <span className="text-emerald-600 font-medium">{activeCount} Active</span>
                {inactiveCount > 0 && <span className="text-gray-400">· {inactiveCount} Inactive</span>}
                {visitorCount > 0 && <span className="text-gray-400">· {visitorCount} Visitors</span>}
              </div>
            </button>

            {/* Card 4: Follow-ups Pending */}
            <button onClick={() => navigate('/followups')} className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-md transition-shadow group">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <UserCheck className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Follow-ups</span>
              </div>
              <span className="text-3xl font-bold text-gray-900">{followupStats.pending + (followupStats.inProgress || 0)}</span>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                {followupStats.overdue > 0 && (
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />{followupStats.overdue} Overdue
                  </span>
                )}
                {followupStats.pending > 0 && <span className="text-gray-400">· {followupStats.pending} Open</span>}
                {followupStats.completedThisWeek > 0 && <span className="text-emerald-600">{followupStats.completedThisWeek} Done</span>}
              </div>
            </button>
          </div>

          {/* ─── ROW 2: CHARTS ─── */}
          {canViewAll && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Chart: Attendance vs Offering */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Attendance vs Offering — Last 12 Weeks</h3>
                </div>
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="week" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                        formatter={(value: any, name: any) => [
                          name === 'offering' ? formatCurrency(value) : value,
                          name === 'offering' ? 'Offering' : 'Attendance'
                        ]}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="right" dataKey="offering" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.7} name="offering" />
                      <Line yAxisId="left" dataKey="attendance" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="attendance" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    Need at least 2 services to show trend
                  </div>
                )}
              </div>

              {/* Chart: Member Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Members by Status</h3>
                </div>
                {totalMembers > 0 ? (
                  <div className="space-y-4">
                    {[
                      { label: 'Active', value: activeCount, pct: totalMembers ? (activeCount / totalMembers) * 100 : 0, color: 'bg-emerald-500' },
                      { label: 'Visitors', value: Math.max(0, visitorCount), pct: totalMembers ? (Math.max(0, visitorCount) / totalMembers) * 100 : 0, color: 'bg-blue-500' },
                      { label: 'Inactive', value: inactiveCount, pct: totalMembers ? (inactiveCount / totalMembers) * 100 : 0, color: 'bg-gray-400' },
                    ].filter(s => s.value > 0).map(s => (
                      <div key={s.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{s.label}</span>
                          <span className="font-medium text-gray-800">{s.value.toLocaleString()} ({s.pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    No member data yet
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── ROW 3: TABLES ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Table: Follow-ups */}
            {canViewFollowups && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">This Week's Follow-ups</h3>
                  <button onClick={() => navigate('/followups')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {(followupTasksQ.data || []).length > 0 ? (
                  <div className="space-y-0 divide-y divide-gray-50">
                    {(followupTasksQ.data || []).slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {task.relatedUser ? `${task.relatedUser.firstName} ${task.relatedUser.lastName}` : task.title}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              task.trigger === 'absent_3_weeks' ? 'bg-amber-50 text-amber-700' :
                              task.trigger === 'new_visitor' ? 'bg-blue-50 text-blue-700' :
                              task.trigger === 'no_tithe' ? 'bg-red-50 text-red-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {task.trigger === 'absent_3_weeks' ? 'Absent' :
                               task.trigger === 'new_visitor' ? 'Visitor' :
                               task.trigger === 'no_tithe' ? 'No Tithe' : task.trigger}
                            </span>
                            <span>→ {task.assignedUser.firstName}</span>
                            {task.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDateShort(task.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        {task.relatedUser?.phone && (
                          <a href={`tel:${task.relatedUser.phone}`} className="ml-3 p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <UserCheck className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">All caught up!</p>
                  </div>
                )}
              </div>
            )}

            {/* Table: Recent Transactions */}
            {canViewFinance && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Recent Transactions</h3>
                  <button onClick={() => navigate('/finance')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                    View All <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                {(recentTxQ.data || []).length > 0 ? (
                  <div className="space-y-0 divide-y divide-gray-50">
                    {(recentTxQ.data || []).slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">
                              {tx.user ? `${tx.user.firstName} ${tx.user.lastName}` : 'Anonymous'}
                            </p>
                            <span className="text-[10px] text-gray-400">{formatDateShort(tx.transactionDate)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span>{tx.category?.name || 'Giving'}</span>
                            <span>·</span>
                            <span className={`${
                              tx.paymentMethod === 'cash' ? 'text-emerald-600' :
                              tx.paymentMethod?.startsWith('mpesa') ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {tx.paymentMethod === 'mpesa_stk' || tx.paymentMethod === 'mpesa_c2b' ? 'M-Pesa' :
                               tx.paymentMethod === 'cash' ? 'Cash' : tx.paymentMethod}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 ml-3">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No transactions yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
