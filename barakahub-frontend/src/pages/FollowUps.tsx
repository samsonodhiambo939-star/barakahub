import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import {
  Users, UserPlus, CheckCircle, Clock, AlertTriangle,
  Phone, Check, X, Calendar, MessageSquare
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

interface AbsentMember {
  id: number; memberNo: string; firstName: string; lastName: string;
  phone: string; estate: string | null; photoUrl: string | null;
  joinDate: string | null; lastSeen: string | null;
  groups: { id: number; name: string }[];
  assignedTask: { id: number; assignedTo: number; status: string; assignedUser: { id: number; firstName: string; lastName: string } } | null;
}

interface VisitorRecord {
  id: number; attendanceId: number; firstName: string; lastName: string;
  phone: string; estate: string | null; photoUrl: string | null;
  visitDate: string; serviceName: string; invitedBy: string | null;
  status: string;
  assignedTask: { id: number; assignedTo: number; status: string; assignedUser: { id: number; firstName: string; lastName: string } } | null;
}

interface FollowUpTask {
  id: number; uuid: string; title: string; description: string | null;
  trigger: string; assignedTo: number; createdBy: number;
  relatedUserId: number | null; status: string; outcome: string | null;
  notes: string | null; closedAt: string | null; dueDate: string | null;
  createdAt: string;
  assignedUser: { id: number; firstName: string; lastName: string };
  relatedUser: { id: number; memberNo: string; firstName: string; lastName: string; phone: string; estate: string | null; photoUrl: string | null } | null;
  group: { id: number; name: string } | null;
}

interface Stats {
  pending: number; inProgress: number; completedThisWeek: number; overdue: number; total: number;
}

interface Leader {
  id: number; firstName: string; lastName: string; phone: string; role: string;
}

// ─── Helpers ─────────────────────────────────────────────

function formatDateShort(d: string | null): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
}

function daysAgo(d: string | null): string {
  if (!d) return 'Never';
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

const triggerLabels: Record<string, string> = {
  absent_3_weeks: 'Absent 3+ Weeks',
  new_visitor: 'First-Time Visitor',
  no_tithe: 'No Tithe 30 Days',
  birthday: 'Birthday',
  manual: 'Manual',
};

const triggerColors: Record<string, string> = {
  absent_3_weeks: 'bg-amber-100 text-amber-800',
  new_visitor: 'bg-blue-100 text-blue-800',
  no_tithe: 'bg-red-100 text-red-800',
  birthday: 'bg-purple-100 text-purple-800',
  manual: 'bg-gray-100 text-gray-600',
};

function getInitialsColor(id: number): string {
  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  return colors[id % colors.length];
}

function Avatar({ name, id, className = 'w-9 h-9' }: { name: string; id: number; className?: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`${className} rounded-full ${getInitialsColor(id)} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Assign Modal ────────────────────────────────────────

function AssignModal({ memberName, memberId, trigger, onClose }: {
  memberName: string; memberId: number; trigger: string; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [leaderId, setLeaderId] = useState<number>(0);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data: leaders } = useQuery({
    queryKey: ['followup-leaders'],
    queryFn: async () => { const r = await api.get('/followups/leaders'); return r.data as Leader[]; },
    staleTime: 60_000,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const reason = trigger === 'absent_3_weeks' ? 'Absent 3+ Sundays' : 'First-time visitor';
      await api.post('/followups/assign', {
        relatedUserId: memberId, trigger, assignedTo: leaderId,
        title: `${memberName} — ${reason}`,
        description: note || undefined,
        dueDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-smart'] });
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Failed to assign'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Assign to Leader</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">Assign follow-up for <strong>{memberName}</strong></p>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Leader *</label>
            <select value={leaderId} onChange={(e) => setLeaderId(parseInt(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value={0}>Choose a leader...</option>
              {(leaders || []).map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName} ({l.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Add instructions for the leader..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => assignMutation.mutate()} disabled={!leaderId || assignMutation.isPending} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mark Done Modal ─────────────────────────────────────

function MarkDoneModal({ task, onClose }: {
  task: FollowUpTask; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState('Contacted');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [error, setError] = useState('');

  const outcomes = ['Contacted', 'No Answer', 'Prayed', 'Visited', 'Joined', 'Lost'];

  const doneMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/followups/tasks/${task.id}/done`, { outcome, notes: notes || undefined, nextActionDate: nextAction || undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-smart'] });
      queryClient.invalidateQueries({ queryKey: ['followup-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['followup-stats'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Failed to update'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Mark Task Done</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            {task.relatedUser ? `${task.relatedUser.firstName} ${task.relatedUser.lastName}` : 'Member'} — {task.title}
          </p>
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome *</label>
            <div className="grid grid-cols-2 gap-2">
              {outcomes.map((o) => (
                <button key={o} type="button" onClick={() => setOutcome(o)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${outcome === o ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >{o}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Any details about this follow-up..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Action Date (optional)</label>
            <input type="date" value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => doneMutation.mutate()} disabled={doneMutation.isPending} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {doneMutation.isPending ? 'Saving...' : 'Mark Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Cards ─────────────────────────────────────────

function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Pending', value: stats.pending, icon: Clock, color: 'bg-amber-500' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Completed (Week)', value: stats.completedThisWeek, icon: CheckCircle, color: 'bg-emerald-500' },
    { label: 'Total Tasks', value: stats.total, icon: Users, color: 'bg-blue-500' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className={`${c.color} p-2.5 rounded-lg`}><c.icon className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: Absent Members ─────────────────────────────────

function AbsentTab({ onAssign }: {
  onAssign: (name: string, id: number, trigger: string) => void;
}) {
  const { user } = useAuth();
  const isLeader = user?.role === 'leader';

  const { data, isLoading } = useQuery({
    queryKey: ['followup-smart', 'absent'],
    queryFn: async () => { const r = await api.get('/followups/smart/absent'); return r.data as AbsentMember[]; },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  if (isLoading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto" /></div>;
  if (!data || data.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <Users className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
      <p className="text-gray-600 font-medium">No absentees — great job!</p>
      <p className="text-sm text-gray-400 mt-1">All members have attended recently.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {!isLeader && (
        <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Estate</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Last Seen</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Group</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Assigned</th>
              <th className="py-3 px-3 w-32"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${m.firstName} ${m.lastName}`} id={m.id} />
                      <div><p className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</p><p className="text-xs text-gray-400">{m.phone}</p></div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-gray-600 hidden md:table-cell">{m.estate || '-'}</td>
                  <td className="py-2.5 px-3"><span className="text-sm text-gray-700">{daysAgo(m.lastSeen)}</span></td>
                  <td className="py-2.5 px-3 hidden lg:table-cell"><span className="text-xs text-gray-500">{m.groups.map((g) => g.name).join(', ') || '-'}</span></td>
                  <td className="py-2.5 px-3">
                    {m.assignedTask ? (
                      <span className="text-xs text-gray-600">{m.assignedTask.assignedUser.firstName} {m.assignedTask.assignedUser.lastName}</span>
                    ) : <span className="text-xs text-amber-600">Unassigned</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      {!m.assignedTask && (
                        <button onClick={() => onAssign(`${m.firstName} ${m.lastName}`, m.id, 'absent_3_weeks')} className="px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">Assign</button>
                      )}
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Phone className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><MessageSquare className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {data.map((m) => (
          <div key={m.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <Avatar name={`${m.firstName} ${m.lastName}`} id={m.id} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{m.firstName} {m.lastName}</p>
                <p className="text-xs text-gray-400">{m.phone}{m.estate ? ` · ${m.estate}` : ''}</p>
                <p className="text-xs text-gray-400 mt-0.5">Last seen: {daysAgo(m.lastSeen)}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {!m.assignedTask && (
                <button onClick={() => onAssign(`${m.firstName} ${m.lastName}`, m.id, 'absent_3_weeks')} className="flex-1 py-2 text-xs bg-emerald-100 text-emerald-700 rounded-lg font-medium">Assign</button>
              )}
              <a href={`tel:${m.phone}`} className="flex-1 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium text-center">Call</a>
              <button className="flex-1 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg font-medium">SMS</button>
            </div>
          </div>
        ))}
      </div>
      {!isLeader && <p className="text-xs text-gray-400 pt-1">{data.length} members absent 3+ weeks</p>}
    </div>
  );
}

// ─── Tab: First-Time Visitors ────────────────────────────

function VisitorsTab({ onAssign }: { onAssign: (name: string, id: number, trigger: string) => void }) {
  const { user } = useAuth();
  const isLeader = user?.role === 'leader';

  const { data, isLoading } = useQuery({
    queryKey: ['followup-smart', 'visitors'],
    queryFn: async () => { const r = await api.get('/followups/smart/visitors'); return r.data as VisitorRecord[]; },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  if (isLoading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto" /></div>;
  if (!data || data.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <UserPlus className="w-12 h-12 text-blue-300 mx-auto mb-3" />
      <p className="text-gray-600 font-medium">No visitors to follow up</p>
      <p className="text-sm text-gray-400 mt-1">New visitors will appear here after their first visit.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {!isLeader && (
        <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Member</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Estate</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Visit Date</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Invited By</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Assigned</th>
              <th className="py-3 px-3 w-32"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((v) => (
                <tr key={v.attendanceId} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${v.firstName} ${v.lastName}`} id={v.id} />
                      <div><p className="text-sm font-medium text-gray-800">{v.firstName} {v.lastName}</p><p className="text-xs text-gray-400">{v.phone}</p></div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-sm text-gray-600 hidden md:table-cell">{v.estate || '-'}</td>
                  <td className="py-2.5 px-3 text-sm text-gray-700">{formatDateShort(v.visitDate)}</td>
                  <td className="py-2.5 px-3 text-sm text-gray-600 hidden lg:table-cell">{v.invitedBy || '-'}</td>
                  <td className="py-2.5 px-3">
                    {v.assignedTask ? (
                      <span className="text-xs text-gray-600">{v.assignedTask.assignedUser.firstName} {v.assignedTask.assignedUser.lastName}</span>
                    ) : <span className="text-xs text-blue-600">Unassigned</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      {!v.assignedTask && (
                        <button onClick={() => onAssign(`${v.firstName} ${v.lastName}`, v.id, 'new_visitor')} className="px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">Assign</button>
                      )}
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Phone className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><MessageSquare className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="sm:hidden space-y-2">
        {data.map((v) => (
          <div key={v.attendanceId} className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-400">
            <div className="flex items-center gap-3">
              <Avatar name={`${v.firstName} ${v.lastName}`} id={v.id} className="w-10 h-10" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm">{v.firstName} {v.lastName}</p>
                <p className="text-xs text-gray-400">{v.phone}{v.estate ? ` · ${v.estate}` : ''}</p>
                <p className="text-xs text-gray-400">Visited {formatDateShort(v.visitDate)}{v.invitedBy ? ` · by ${v.invitedBy}` : ''}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {!v.assignedTask && (
                <button onClick={() => onAssign(`${v.firstName} ${v.lastName}`, v.id, 'new_visitor')} className="flex-1 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium">Assign</button>
              )}
              <a href={`tel:${v.phone}`} className="flex-1 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium text-center">Call</a>
              <button className="flex-1 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg font-medium">SMS</button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 pt-1">{data.length} visitors in last 14 days</p>
    </div>
  );
}

// ─── Tab: My Tasks (Leader view) ─────────────────────────

function MyTasksTab({ onMarkDone }: {
  onMarkDone: (task: FollowUpTask) => void;
}) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['followup-tasks', 'mine', user?.id],
    queryFn: async () => {
      const r = await api.get(`/followups?assignedTo=${user!.id}&status=open&limit=100`);
      return r.data as { data: FollowUpTask[]; pagination: any };
    },
    refetchInterval: 15_000,
    enabled: !!user,
  });

  if (isLoading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto" /></div>;
  if (!data || data.data.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
      <p className="text-gray-600 font-medium">All caught up!</p>
      <p className="text-sm text-gray-400 mt-1">No pending tasks assigned to you.</p>
    </div>
  );

  const tasks = data.data;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">{tasks.length} pending task{tasks.length !== 1 ? 's' : ''}</p>
      {tasks.map((t) => (
        <div key={t.id} className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-start gap-3">
            {t.relatedUser ? (
              <Avatar name={`${t.relatedUser.firstName} ${t.relatedUser.lastName}`} id={t.relatedUser.id} className="w-10 h-10" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><Users className="w-5 h-5 text-gray-400" /></div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 text-sm">
                {t.relatedUser ? `${t.relatedUser.firstName} ${t.relatedUser.lastName}` : 'Member'}
              </p>
              <p className="text-xs text-gray-400">{t.relatedUser?.phone}</p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${triggerColors[t.trigger] || 'bg-gray-100 text-gray-600'}`}>
                  {triggerLabels[t.trigger] || t.trigger}
                </span>
                {t.dueDate && (
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due {formatDateShort(t.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t.title}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <a href={`tel:${t.relatedUser?.phone}`} className="flex items-center justify-center gap-1 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg font-medium">
              <Phone className="w-3.5 h-3.5" /> Call
            </a>
            <button className="flex items-center justify-center gap-1 py-2 text-xs bg-gray-100 text-gray-600 rounded-lg font-medium">
              <MessageSquare className="w-3.5 h-3.5" /> SMS
            </button>
            <button onClick={() => onMarkDone(t)} className="flex items-center justify-center gap-1 py-2 text-xs bg-emerald-100 text-emerald-700 rounded-lg font-medium">
              <Check className="w-3.5 h-3.5" /> Done
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tab: All Tasks ──────────────────────────────────────

function AllTasksTab({ onMarkDone }: {
  onMarkDone: (task: FollowUpTask) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('open');

  const { data, isLoading } = useQuery({
    queryKey: ['followup-tasks', 'all', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter) params.set('status', statusFilter);
      const r = await api.get(`/followups?${params.toString()}`);
      return r.data as { data: FollowUpTask[]; pagination: any };
    },
    staleTime: 10_000,
  });

  const filters = [
    { value: 'open', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'closed', label: 'Completed' },
    { value: '', label: 'All' },
  ];

  if (isLoading) return <div className="text-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto" /></div>;
  if (!data || data.data.length === 0) return (
    <div className="bg-white rounded-xl shadow-sm p-12 text-center">
      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-600 font-medium">No tasks found</p>
      <p className="text-sm text-gray-400 mt-1">Assign follow-ups from the Absent or Visitors tabs.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap ${statusFilter === f.value ? 'bg-emerald-100 text-emerald-800 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >{f.label}</button>
        ))}
      </div>

      <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead><tr className="border-b border-gray-200">
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Member</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Type</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Assigned To</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Due</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="py-3 px-3 w-24"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {data.data.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    {t.relatedUser ? (
                      <><Avatar name={`${t.relatedUser.firstName} ${t.relatedUser.lastName}`} id={t.relatedUser.id} /><div><p className="text-sm font-medium text-gray-800">{t.relatedUser.firstName} {t.relatedUser.lastName}</p><p className="text-xs text-gray-400">{t.relatedUser.phone}</p></div></>
                    ) : <span className="text-sm text-gray-400">-</span>}
                  </div>
                </td>
                <td className="py-2.5 px-3 hidden md:table-cell">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${triggerColors[t.trigger] || ''}`}>
                    {triggerLabels[t.trigger] || t.trigger}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-sm text-gray-700">{t.assignedUser.firstName} {t.assignedUser.lastName}</td>
                <td className="py-2.5 px-3 text-sm text-gray-600">{t.dueDate ? formatDateShort(t.dueDate) : '-'}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.status === 'closed' ? 'bg-emerald-100 text-emerald-800' : t.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                    {t.status === 'closed' ? 'Done' : t.status === 'in_progress' ? 'In Progress' : t.status === 'overdue' ? 'Overdue' : 'Pending'}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {t.status !== 'closed' && (
                    <button onClick={() => onMarkDone(t)} className="px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">Mark Done</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-2">
        {data.data.map((t) => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              {t.relatedUser ? (
                <><Avatar name={`${t.relatedUser.firstName} ${t.relatedUser.lastName}`} id={t.relatedUser.id} className="w-10 h-10" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">{t.relatedUser.firstName} {t.relatedUser.lastName}</p>
                  <p className="text-xs text-gray-400">{t.relatedUser.phone}</p>
                </div></>
              ) : <div className="flex-1"><p className="font-medium text-gray-800 text-sm">Member</p></div>}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.status === 'closed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {t.status === 'closed' ? 'Done' : 'Pending'}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span className={`px-2 py-0.5 rounded-full font-medium ${triggerColors[t.trigger] || ''}`}>{triggerLabels[t.trigger] || t.trigger}</span>
              <span>{t.assignedUser.firstName} {t.assignedUser.lastName}</span>
              {t.dueDate && <span>Due {formatDateShort(t.dueDate)}</span>}
            </div>
            {t.status !== 'closed' && (
              <button onClick={() => onMarkDone(t)} className="mt-2 w-full py-2 text-xs bg-emerald-100 text-emerald-700 rounded-lg font-medium">Mark Done</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function FollowUps() {
  const { user } = useAuth();
  if (!user) return null;

  const userRole = user.role;
  const isAdmin = ['admin', 'pastor'].includes(userRole);
  const isLeader = userRole === 'leader';
  const canView = isAdmin || isLeader || userRole === 'secretary';

  const [activeTab, setActiveTab] = useState('absent');
  const [assignTarget, setAssignTarget] = useState<{ name: string; id: number; trigger: string } | null>(null);
  const [doneTarget, setDoneTarget] = useState<FollowUpTask | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['followup-stats'],
    queryFn: async () => { const r = await api.get('/followups/stats'); return r.data as Stats; },
    refetchInterval: 30_000,
    enabled: isAdmin,
  });

  if (!canView) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Access Restricted</p>
        <p className="text-sm text-gray-400 mt-1">You do not have permission to view Follow-ups.</p>
      </div>
    );
  }

  const tabs = [];
  if (isLeader) {
    tabs.push({ id: 'my-tasks', label: 'My Tasks' });
  } else {
    tabs.push({ id: 'absent', label: 'Absent 3+ Weeks' });
    tabs.push({ id: 'visitors', label: 'First-Time Visitors' });
    tabs.push({ id: 'all-tasks', label: 'All Tasks' });
  }
  if (isAdmin) {
    tabs.push({ id: 'my-tasks', label: 'My Tasks' });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Follow-ups</h1>

      {stats && isAdmin && <StatsCards stats={stats} />}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}
          >{t.label}</button>
        ))}
      </div>

      {activeTab === 'absent' && (
        <AbsentTab
          onAssign={(name, id, trigger) => setAssignTarget({ name, id, trigger })}
        />
      )}

      {activeTab === 'visitors' && (
        <VisitorsTab
          onAssign={(name, id, trigger) => setAssignTarget({ name, id, trigger })}
        />
      )}

      {activeTab === 'all-tasks' && (
        <AllTasksTab
          onMarkDone={(t) => setDoneTarget(t)}
        />
      )}

      {activeTab === 'my-tasks' && (
        <MyTasksTab
          onMarkDone={(t) => setDoneTarget(t)}
        />
      )}

      {assignTarget && (
        <AssignModal
          memberName={assignTarget.name}
          memberId={assignTarget.id}
          trigger={assignTarget.trigger}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {doneTarget && (
        <MarkDoneModal
          task={doneTarget}
          onClose={() => setDoneTarget(null)}
        />
      )}
    </div>
  );
}
