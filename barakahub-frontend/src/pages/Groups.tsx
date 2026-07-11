import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import {
  Users, Plus, X, Search, MoreVertical, ChevronLeft, ChevronRight,
  MapPin, Calendar, Clock, UserMinus,
  Shield, Star, Church, AlertTriangle,
} from 'lucide-react';

interface Group {
  id: number; name: string; type: string; description: string | null;
  leaderId: number | null; assistantLeaderId: number | null;
  estate: string | null; meetingDay: string | null; meetingTime: string | null;
  location: string | null; status: string;
  createdAt: string;
  leader: { id: number; firstName: string; lastName: string; phone: string; photoUrl: string | null } | null;
  assistantLeader: { id: number; firstName: string; lastName: string } | null;
  _count: { members: number };
}

interface GroupDetail extends Group {
  members: GroupMember[];
  _count: { members: number; followUps: number };
}

interface GroupMember {
  id: number; groupId: number; userId: number; role: string; joinedAt: string;
  user: {
    id: number; memberNo: string; firstName: string; lastName: string;
    phone: string; estate: string | null; photoUrl: string | null;
    role: string; status: string; joinDate: string | null;
  };
}

interface MemberOption {
  id: number; memberNo: string; firstName: string; lastName: string;
  phone: string; estate: string | null;
}

const GROUP_TYPES = [
  { value: 'cell', label: 'Cell Group' },
  { value: 'department', label: 'Department' },
  { value: 'ministry', label: 'Ministry' },
  { value: 'committee', label: 'Committee' },
];

const MEETING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  ...GROUP_TYPES,
];

const typeLabels: Record<string, string> = {
  cell: 'Cell Group', department: 'Department', ministry: 'Ministry', committee: 'Committee',
};

const typeColors: Record<string, string> = {
  cell: 'bg-emerald-100 text-emerald-800',
  department: 'bg-blue-100 text-blue-800',
  ministry: 'bg-purple-100 text-purple-800',
  committee: 'bg-amber-100 text-amber-800',
};

function Avatar({ name, photoUrl, size = 'md' }: { name: string; photoUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm';
  if (photoUrl) return <img src={photoUrl} className={`${s} rounded-full object-cover`} />;
  return <div className={`${s} rounded-full bg-emerald-500 text-white flex items-center justify-center font-medium shrink-0`}>{initials}</div>;
}

function SlideOver({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Drawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 border-b p-4 flex items-center justify-between">
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function Groups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'pastor';
  const isSecretary = user?.role === 'secretary';
  const isGroupLeader = user?.role === 'leader';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null);
  const [detailTab, setDetailTab] = useState('members');

  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<MemberOption[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const isAdminPastor = isAdmin;

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);
  if (typeFilter !== 'all') params.set('type', typeFilter);
  if (statusFilter !== 'all') params.set('status', statusFilter);

  const groupsQ = useQuery({
    queryKey: ['groups', params.toString()],
    queryFn: () => api.get(`/groups?${params}`).then(r => r.data),
    staleTime: 30_000,
  });

  const myGroupsQ = useQuery({
    queryKey: ['groups', 'my'],
    queryFn: () => api.get('/groups/my').then(r => r.data),
    staleTime: 30_000,
    enabled: isGroupLeader,
  });

  const detailQ = useQuery({
    queryKey: ['groups', selectedGroup?.id],
    queryFn: () => api.get(`/groups/${selectedGroup!.id}`).then(r => r.data as GroupDetail),
    enabled: !!selectedGroup,
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/groups', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groups'] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/groups/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groups'] }); setEditGroup(null); setSelectedGroup(null); },
  });

  const addMembersMutation = useMutation({
    mutationFn: ({ id, memberIds }: { id: number; memberIds: number[] }) => api.post(`/groups/${id}/members/bulk`, { memberIds }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groups'] }); setSelectedMemberIds([]); setMemberResults([]); setMemberSearch(''); },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: number; userId: number }) => api.delete(`/groups/${groupId}/members/${userId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groups'] }); },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: number; userId: number; role: string }) => api.put(`/groups/${groupId}/members/${userId}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['groups'] }); },
  });

  const groups = isGroupLeader ? (myGroupsQ.data || []) : (groupsQ.data?.data || []);
  const pagination = groupsQ.data?.pagination;
  const detail = detailQ.data;

  function handleSearchMembers(q: string) {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    api.get(`/members?search=${q}&limit=10`).then(r => setMemberResults(r.data.data || [])).catch(() => {});
  }

  function toggleMemberSelection(id: number) {
    setSelectedMemberIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleAddMembers() {
    if (!selectedGroup || selectedMemberIds.length === 0) return;
    addMembersMutation.mutate({ id: selectedGroup.id, memberIds: selectedMemberIds });
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = { name: fd.get('name') };
    if (fd.get('type')) data.type = fd.get('type');
    if (fd.get('description')) data.description = fd.get('description');
    if (fd.get('leaderId')) data.leaderId = Number(fd.get('leaderId'));
    if (fd.get('assistantLeaderId')) data.assistantLeaderId = Number(fd.get('assistantLeaderId'));
    if (fd.get('estate')) data.estate = fd.get('estate');
    if (fd.get('meetingDay')) data.meetingDay = fd.get('meetingDay');
    if (fd.get('meetingTime')) data.meetingTime = fd.get('meetingTime');
    if (fd.get('location')) data.location = fd.get('location');
    if (fd.get('status')) data.status = fd.get('status');
    createMutation.mutate(data);
  }

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editGroup) return;
    const fd = new FormData(e.currentTarget);
    const data: any = {};
    if (fd.get('name')) data.name = fd.get('name');
    if (fd.get('type')) data.type = fd.get('type');
    if (fd.get('description')) data.description = fd.get('description');
    if (fd.get('leaderId')) data.leaderId = Number(fd.get('leaderId'));
    if (fd.get('assistantLeaderId')) data.assistantLeaderId = Number(fd.get('assistantLeaderId'));
    if (fd.get('estate')) data.estate = fd.get('estate');
    if (fd.get('meetingDay')) data.meetingDay = fd.get('meetingDay');
    if (fd.get('meetingTime')) data.meetingTime = fd.get('meetingTime');
    if (fd.get('location')) data.location = fd.get('location');
    if (fd.get('status')) data.status = fd.get('status');
    updateMutation.mutate({ id: editGroup.id, data });
  }

  if (user && !['admin', 'pastor', 'leader', 'secretary'].includes(user.role)) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Church className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">You don't have access to Groups.</p>
      </div>
    );
  }

  const isCreating = createMutation.isPending;
  const isUpdating = updateMutation.isPending;
  const isAdding = addMembersMutation.isPending;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage cell groups, departments, ministries, and committees</p>
        </div>
        {(isAdmin || isSecretary) && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Create Group
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search groups..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
          {TYPE_FILTERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2 text-sm">
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Loading State */}
      {groupsQ.isLoading && !isGroupLeader && (
        <div className="grid gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!groupsQ.isLoading && groups.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No groups yet</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-4">Create your first Cell Group to organize pastoral care and streamline follow-ups.</p>
          {(isAdmin || isSecretary) && (
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
              <Plus className="w-4 h-4" /> Create Group
            </button>
          )}
        </div>
      )}

      {/* Groups List */}
      {groups.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Leader</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Members</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estate</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map((g: Group) => (
                  <tr key={g.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedGroup(g as any); setDetailTab('members'); }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${typeColors[g.type] || 'bg-gray-100 text-gray-600'} flex items-center justify-center text-sm font-medium`}>
                          {g.type === 'cell' ? 'C' : g.type === 'department' ? 'D' : g.type === 'ministry' ? 'M' : 'CO'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{g.name}</p>
                          {g.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{g.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[g.type] || 'bg-gray-100 text-gray-600'}`}>
                        {typeLabels[g.type] || g.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {g.leader ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={`${g.leader.firstName} ${g.leader.lastName}`} photoUrl={g.leader.photoUrl} size="sm" />
                          <span className="text-sm text-gray-700">{g.leader.firstName} {g.leader.lastName}</span>
                        </div>
                      ) : <span className="text-sm text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-800">{g._count?.members || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {g.estate || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${g.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                        {g.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setEditGroup(g); }} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden grid gap-3">
            {groups.map((g: Group) => (
              <div key={g.id} className="bg-white rounded-xl shadow-sm p-4" onClick={() => { setSelectedGroup(g as any); setDetailTab('members'); }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${typeColors[g.type] || 'bg-gray-100'} flex items-center justify-center text-xs font-medium`}>
                      {g.type === 'cell' ? 'C' : g.type === 'department' ? 'D' : g.type === 'ministry' ? 'M' : 'CO'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{g.name}</p>
                      <p className="text-xs text-gray-400">{typeLabels[g.type] || g.type}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setEditGroup(g); }} className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{g._count?.members || 0} members</span>
                  {g.leader && <span>Led by {g.leader.firstName}</span>}
                  {g.estate && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{g.estate}</span>}
                </div>
                <div className="mt-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${g.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                    {g.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{pagination.total} groups total</p>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm text-gray-600">{page} / {pagination.totalPages}</span>
                <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── CREATE GROUP SLIDE-OVER ─── */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="Create Group">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input name="name" required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Kilimani Cell Group A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select name="type" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {GROUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leader</label>
            <input name="leaderId" type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Member ID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assistant Leader</label>
            <input name="assistantLeaderId" type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Member ID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estate</label>
            <input name="estate" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Kilimani" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Day</label>
              <select name="meetingDay" className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select day</option>
                {MEETING_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Time</label>
              <input name="meetingTime" type="time" className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input name="location" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Main Church, Youth Centre" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isCreating} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {isCreating ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </SlideOver>

      {/* ─── EDIT GROUP SLIDE-OVER ─── */}
      <SlideOver open={!!editGroup} onClose={() => setEditGroup(null)} title="Edit Group">
        {editGroup && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input name="name" defaultValue={editGroup.name} required className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="type" defaultValue={editGroup.type} className="w-full border rounded-lg px-3 py-2 text-sm">
                {GROUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea name="description" defaultValue={editGroup.description || ''} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estate</label>
              <input name="estate" defaultValue={editGroup.estate || ''} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select name="status" defaultValue={editGroup.status} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditGroup(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={isUpdating} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {isUpdating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </SlideOver>

      {/* ─── GROUP DETAIL DRAWER ─── */}
      <Drawer open={!!selectedGroup} onClose={() => { setSelectedGroup(null); setMemberSearch(''); setMemberResults([]); setSelectedMemberIds([]); }}>
        {detail && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl ${typeColors[detail.type] || 'bg-gray-100'} flex items-center justify-center text-lg font-bold`}>
                {detail.type === 'cell' ? 'C' : detail.type === 'department' ? 'D' : detail.type === 'ministry' ? 'M' : 'CO'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{detail.name}</h2>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeColors[detail.type] || 'bg-gray-100'}`}>{typeLabels[detail.type] || detail.type}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${detail.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                    {detail.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                  <span>{detail._count?.members || 0} members</span>
                </div>
                {detail.estate && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{detail.estate}</p>
                )}
                {detail.leader && (
                  <div className="flex items-center gap-2 mt-3">
                    <Avatar name={`${detail.leader.firstName} ${detail.leader.lastName}`} photoUrl={detail.leader.photoUrl} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{detail.leader.firstName} {detail.leader.lastName}</p>
                      <p className="text-xs text-gray-400">Leader</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Meeting Info */}
            {(detail.meetingDay || detail.meetingTime || detail.location) && (
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                {detail.meetingDay && <div><p className="text-xs text-gray-400 mb-0.5"><Calendar className="w-3 h-3 inline mr-1" />Day</p><p className="font-medium text-gray-800">{detail.meetingDay}</p></div>}
                {detail.meetingTime && <div><p className="text-xs text-gray-400 mb-0.5"><Clock className="w-3 h-3 inline mr-1" />Time</p><p className="font-medium text-gray-800">{detail.meetingTime}</p></div>}
                {detail.location && <div><p className="text-xs text-gray-400 mb-0.5"><MapPin className="w-3 h-3 inline mr-1" />Location</p><p className="font-medium text-gray-800">{detail.location}</p></div>}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b">
              {[
                { key: 'members', label: 'Members' },
                { key: 'attendance', label: 'Attendance' },
                { key: 'giving', label: 'Giving' },
                { key: 'followups', label: 'Follow-ups' },
              ].filter(t => {
                if (t.key === 'giving' && isSecretary) return false;
                return true;
              }).map(tab => (
                <button key={tab.key} onClick={() => setDetailTab(tab.key)} className={`pb-2 text-sm font-medium border-b-2 transition-colors ${detailTab === tab.key ? 'text-emerald-600 border-emerald-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Members */}
            {detailTab === 'members' && (
              <div className="space-y-4">
                {(isAdminPastor || isSecretary || isGroupLeader) && (
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Add Members</p>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input value={memberSearch} onChange={e => handleSearchMembers(e.target.value)} placeholder="Search members..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
                    </div>
                    {memberResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg mb-3">
                        {memberResults.map(m => (
                          <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={selectedMemberIds.includes(m.id)} onChange={() => toggleMemberSelection(m.id)} className="rounded" />
                            <span className="text-sm">{m.firstName} {m.lastName}</span>
                            <span className="text-xs text-gray-400 ml-auto">{m.phone}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {selectedMemberIds.length > 0 && (
                      <button onClick={handleAddMembers} disabled={isAdding} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                        {isAdding ? 'Adding...' : `Add ${selectedMemberIds.length} member${selectedMemberIds.length > 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {detail.members?.map((m: GroupMember) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={`${m.user.firstName} ${m.user.lastName}`} photoUrl={m.user.photoUrl} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">{m.user.firstName} {m.user.lastName}</p>
                            {m.role === 'leader' && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                            {m.role === 'assistant' && <Star className="w-3.5 h-3.5 text-blue-500" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{m.user.phone}</span>
                            {m.user.estate && <span>· {m.user.estate}</span>}
                            {m.role !== 'member' && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${m.role === 'leader' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{m.role}</span>}
                          </div>
                        </div>
                      </div>
                      {isAdminPastor && (
                        <div className="flex items-center gap-2">
                          {m.role !== 'assistant' && (
                            <button onClick={() => updateRoleMutation.mutate({ groupId: detail.id, userId: m.userId, role: 'assistant' })} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Promote to Assistant">
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => { if (confirm('Remove this member?')) removeMemberMutation.mutate({ groupId: detail.id, userId: m.userId }); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Remove">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Attendance */}
            {detailTab === 'attendance' && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Attendance tracking coming soon
              </div>
            )}

            {/* Tab: Giving */}
            {detailTab === 'giving' && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Group giving reports coming soon
              </div>
            )}

            {/* Tab: Follow-ups */}
            {detailTab === 'followups' && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Group follow-up routing coming soon
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
