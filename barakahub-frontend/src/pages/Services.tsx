import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import {
  Search, Plus, X, ChevronLeft, ChevronRight,
  Church, Users, DollarSign, CheckCircle, XCircle,
  AlertTriangle, UserPlus, ArrowLeft,
  Check, Undo2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

interface ServiceRecord {
  id: number;
  uuid: string;
  name: string;
  serviceType: string;
  date: string;
  location: string | null;
  notes: string | null;
  status: string;
  totalAttendance: number;
  totalOffering: number;
  closedAt: string | null;
  closedBy: number | null;
  createdBy: number;
  createdAt: string;
  createdByUser: { id: number; firstName: string; lastName: string };
  closedByUser?: { id: number; firstName: string; lastName: string } | null;
  _count: { attendances: number };
}

interface AttendanceRecord {
  id: number;
  uuid: string;
  userId: number;
  serviceId: number;
  checkInTime: string;
  checkInMethod: string;
  isFirstTime: boolean;
  isOfflineSync: boolean;
  user: {
    id: number; memberNo: string; firstName: string; lastName: string;
    phone: string; estate: string | null; photoUrl: string | null; gender: string;
  };
  checkedInByUser?: { id: number; firstName: string; lastName: string } | null;
}

interface Member {
  id: number; memberNo: string; firstName: string; lastName: string;
  phone: string; estate: string | null; photoUrl: string | null;
}

// ─── Helpers ─────────────────────────────────────────────

const serviceTypeLabels: Record<string, string> = {
  sunday_service: 'Main Service',
  midweek: 'Midweek',
  kesha: 'Kesha',
  wedding: 'Wedding',
  funeral: 'Funeral',
  conference: 'Conference',
  special: 'Special',
};

const checkInMethodLabels: Record<string, string> = {
  manual: 'Manual',
  qr_code: 'QR Code',
  ussd: 'USSD',
  visitor: 'Visitor',
  bulk: 'Bulk',
};

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(n: number): string {
  return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
}

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

function StatusBadge({ status }: { status: string }) {
  if (status === 'active') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3" />Active</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><XCircle className="w-3 h-3" />Closed</span>;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

// ─── Start Service Dialog ────────────────────────────────

function StartServiceDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('Main Service');
  const [serviceType, setServiceType] = useState('sunday_service');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/services', { name, serviceType, date, location: location || undefined });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Failed to create service'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Church className="w-5 h-5 text-emerald-600" />Start New Service</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setError(''); createMutation.mutate(); }} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
            <select value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option>Main Service</option>
              <option>Youth Service</option>
              <option>Midweek Service</option>
              <option>Sunday School</option>
              <option>Evening Service</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {Object.entries(serviceTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="e.g. Main Church, Youth Centre" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {createMutation.isPending ? 'Creating...' : 'Start Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Close Service Dialog ────────────────────────────────

function CloseServiceDialog({ service, onClose }: { service: ServiceRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/services/${service.id}/close`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-attendance', service.id] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || 'Failed to close service'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-4 border-b"><h2 className="font-semibold text-gray-800">Close Service</h2></div>
        <div className="p-4 space-y-3">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <p className="text-sm text-gray-600">Close <strong>{service.name}</strong> on {formatDate(service.date)}?</p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Attendance:</span> <strong>{service._count.attendances}</strong></p>
            <p className="text-amber-600 text-xs flex items-start gap-1 mt-2">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              After closing, no more check-ins allowed. Only admins can reopen.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {closeMutation.isPending ? 'Closing...' : 'Close Service'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Visitor Form ────────────────────────────────────────

function VisitorForm({ serviceId, onClose }: { serviceId: number; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [estate, setEstate] = useState('');
  const [invitedBy, setInvitedBy] = useState('');
  const [error, setError] = useState('');

  const { data: members } = useQuery({
    queryKey: ['members-search-invited', invitedBy],
    queryFn: async () => {
      if (!invitedBy || invitedBy.length < 2) return [];
      const res = await api.get(`/members?search=${encodeURIComponent(invitedBy)}&limit=10`);
      return res.data.data as Member[];
    },
    enabled: invitedBy.length >= 2,
    staleTime: 30_000,
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const sanitizedPhone = phone.startsWith('0') ? `254${phone.slice(1)}` : phone.startsWith('+') ? phone.slice(1) : phone;
      if (!/^(254)[17]\d{8}$/.test(sanitizedPhone)) throw new Error('Valid Kenyan phone required (2547XXXXXXXX)');

      const memberRes = await api.post('/members', {
        firstName, lastName, phone: sanitizedPhone, gender: 'male',
        estate: estate || undefined, physicalAddress: estate || undefined,
      });

      const attendanceRes = await api.post('/check-in', {
        userId: memberRes.data.id, serviceId, checkInMethod: 'visitor', isFirstTime: true,
      });

      return attendanceRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance', serviceId] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      onClose();
    },
    onError: (err: any) => setError(err.response?.data?.error || err.message || 'Failed to add visitor'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim()) { setError('Name is required'); return; }
    if (!phone.trim()) { setError('Phone is required'); return; }
    checkinMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-500" />Add Visitor</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value.replace(/[^a-zA-Z\s-]/g, ''))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+]/g, ''))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="2547XXXXXXXX" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estate</label>
            <input value={estate} onChange={(e) => setEstate(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Invited By</label>
            <input value={invitedBy} onChange={(e) => setInvitedBy(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Search member name..." />
            {members && members.length > 0 && invitedBy.length >= 2 && (
              <div className="mt-1 border rounded-lg max-h-32 overflow-y-auto">
                {members.map((m) => (
                  <button key={m.id} type="button" onClick={() => setInvitedBy(`${m.firstName} ${m.lastName} (${m.phone})`)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">{m.firstName} {m.lastName}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={checkinMutation.isPending} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {checkinMutation.isPending ? 'Adding...' : 'Add & Check In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Service Table (desktop) ─────────────────────────────

function ServiceTable({ services, onSelect, onClose, canClose }: {
  services: ServiceRecord[];
  onSelect: (s: ServiceRecord) => void;
  onClose: (s: ServiceRecord) => void;
  canClose: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
            <th className="text-center py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
            <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Offering</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="py-3 px-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {services.map((s) => (
            <tr key={s.id} onClick={() => onSelect(s)} className="hover:bg-gray-50 cursor-pointer transition-colors">
              <td className="py-3 px-3">
                <div className="text-sm text-gray-800">{formatDate(s.date)}</div>
                <div className="text-xs text-gray-400">{formatTime(s.date)}</div>
              </td>
              <td className="py-3 px-3 font-medium text-gray-800 text-sm">{s.name}</td>
              <td className="py-3 px-3 text-sm text-gray-600 hidden md:table-cell">{serviceTypeLabels[s.serviceType] || s.serviceType}</td>
              <td className="py-3 px-3 text-center">
                <span className="text-lg font-bold text-gray-800">{s._count.attendances}</span>
              </td>
              <td className="py-3 px-3 text-right text-sm text-gray-700 hidden lg:table-cell">{s.totalOffering > 0 ? formatCurrency(s.totalOffering) : '-'}</td>
              <td className="py-3 px-3"><StatusBadge status={s.status} /></td>
              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                {s.status === 'active' && canClose && (
                  <button onClick={() => onClose(s)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Close service">
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Service Card (mobile) ───────────────────────────────

function ServiceCard({ service, onSelect, canClose, onClose }: {
  service: ServiceRecord;
  onSelect: (s: ServiceRecord) => void;
  canClose: boolean;
  onClose: (s: ServiceRecord) => void;
}) {
  return (
    <div onClick={() => onSelect(service)} className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800">{service.name}</p>
          <p className="text-xs text-gray-400">{formatDate(service.date)} · {formatTime(service.date)}</p>
        </div>
        <StatusBadge status={service.status} />
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1 text-gray-600"><Users className="w-4 h-4" />{service._count.attendances}</span>
        {service.totalOffering > 0 && <span className="flex items-center gap-1 text-gray-600"><DollarSign className="w-4 h-4" />{formatCurrency(service.totalOffering)}</span>}
        {service.status === 'active' && canClose && (
          <button onClick={(e) => { e.stopPropagation(); onClose(service); }} className="ml-auto p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  );
}

// ─── Check-in Screen ─────────────────────────────────────

function CheckInScreen({ service, onBack, userRole }: {
  service: ServiceRecord;
  onBack: () => void;
  userRole: string;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [showVisitorForm, setShowVisitorForm] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'checked' | 'not-checked'>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  const canManage = ['admin', 'pastor'].includes(userRole);
  const canClose = canManage;
  const canCheckIn = ['admin', 'pastor', 'secretary', 'usher', 'leader'].includes(userRole);

  const { data: attendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ['service-attendance', service.id],
    queryFn: async () => {
      const res = await api.get(`/services/${service.id}/attendance`);
      return res.data as AttendanceRecord[];
    },
    refetchInterval: 5_000,
  });

  const { data: searchResults } = useQuery({
    queryKey: ['members-checkin', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const res = await api.get(`/members?search=${encodeURIComponent(debouncedSearch)}&limit=20`);
      return res.data.data as Member[];
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 10_000,
  });

  const { data: allMembers } = useQuery({
    queryKey: ['members-all'],
    queryFn: async () => {
      const res = await api.get('/members?limit=5000');
      return res.data.data as Member[];
    },
    staleTime: 60_000,
  });

  const checkinMutation = useMutation({
    mutationFn: async (userId: number) => {
      await api.post('/check-in', { userId, serviceId: service.id, checkInMethod: 'manual' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance', service.id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setSearch('');
      searchRef.current?.focus();
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (userId: number) => {
      await api.post(`/services/${service.id}/attendance/${userId}/undo`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance', service.id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });

  const checkedInIds = new Set((attendance || []).map((a) => a.userId));
  const isServiceClosed = service.status === 'closed';

  const filteredAttendance = statusFilter === 'checked' ? (attendance || []) : (attendance || []);

  const searchFilteredMembers = (searchResults || []).filter((m) => !checkedInIds.has(m.id));

  const notCheckedInCount = allMembers ? allMembers.filter((m) => !checkedInIds.has(m.id)).length : 0;

  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-800">{service.name}</h1>
          <p className="text-sm text-gray-500">{formatDate(service.date)} · {service.serviceType && serviceTypeLabels[service.serviceType]}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-emerald-600">{attendance?.length || 0}</p>
          <p className="text-xs text-gray-400">Checked In</p>
        </div>
      </div>

      {isServiceClosed && (
        <div className="p-3 bg-gray-100 text-gray-600 rounded-xl text-sm flex items-center gap-2 mb-4">
          <XCircle className="w-4 h-4" /> This service is closed. No new check-ins allowed.
          {userRole === 'admin' && (
            <button
              onClick={async () => {
                await api.post(`/services/${service.id}/reopen`);
                queryClient.invalidateQueries({ queryKey: ['services'] });
                queryClient.invalidateQueries({ queryKey: ['service-attendance', service.id] });
              }}
              className="ml-auto text-emerald-600 font-medium hover:text-emerald-700"
            >
              Reopen
            </button>
          )}
        </div>
      )}

      {/* Check-in action bar */}
      {!isServiceClosed && canCheckIn && (
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search member by name, phone or estate..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-emerald-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-emerald-50/30 text-base"
              autoFocus
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowVisitorForm(true)} className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              <UserPlus className="w-4 h-4" />Add Visitor
            </button>
            <div className="text-xs text-gray-400 ml-auto">
              {notCheckedInCount} not yet checked in
            </div>
          </div>

          {/* Search results */}
          {search.length >= 2 && searchFilteredMembers.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border max-h-64 overflow-y-auto">
              {searchFilteredMembers.slice(0, 10).map((m) => (
                <button
                  key={m.id}
                  onClick={() => checkinMutation.mutate(m.id)}
                  disabled={checkinMutation.isPending}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-gray-50 last:border-0 disabled:opacity-50"
                >
                  <Avatar name={`${m.firstName} ${m.lastName}`} id={m.id} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-800">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-gray-400">{m.phone}{m.estate ? ` · ${m.estate}` : ''}</p>
                  </div>
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {search.length >= 2 && searchResults && searchResults.length > 0 && searchFilteredMembers.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border p-4 text-center text-sm text-gray-400">
              All matching members are already checked in
            </div>
          )}

          {search.length >= 2 && searchResults && searchResults.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border p-4 text-center text-sm text-gray-400">
              No members found. <button onClick={() => setShowVisitorForm(true)} className="text-blue-600 font-medium">Add as visitor</button>
            </div>
          )}
        </div>
      )}

      {/* Attendance table */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <Users className="w-4 h-4" /> Attendance ({attendance?.length || 0})
        </h2>
        <div className="flex gap-1">
          <button onClick={() => setStatusFilter('all')} className={`px-3 py-1 text-xs rounded-full ${statusFilter === 'all' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:bg-gray-100'}`}>All</button>
          <button onClick={() => setStatusFilter('checked')} className={`px-3 py-1 text-xs rounded-full ${statusFilter === 'checked' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:bg-gray-100'}`}>Checked</button>
        </div>
      </div>

      {loadingAttendance ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto" /></div>
      ) : !attendance || attendance.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">No one checked in yet</p>
          <p className="text-sm text-gray-400 mt-1">Search members above to check them in</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Desktop table */}
          <div className="bg-white rounded-xl shadow-sm hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Estate</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Method</th>
                    <th className="py-3 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAttendance.map((a) => (
                    <tr key={a.id} className={a.isFirstTime ? 'bg-blue-50/50' : ''}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={`${a.user.firstName} ${a.user.lastName}`} id={a.user.id} className="w-8 h-8" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{a.user.firstName} {a.user.lastName}</p>
                            <p className="text-xs text-gray-400">{a.user.phone}{a.isFirstTime ? ' · 🆕 First visit' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-sm text-gray-600 hidden md:table-cell">{a.user.estate || '-'}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-sm text-gray-700">{formatTime(a.checkInTime)}</div>
                      </td>
                      <td className="py-2.5 px-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{checkInMethodLabels[a.checkInMethod] || a.checkInMethod}</span>
                      </td>
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        {!isServiceClosed && canManage && (
                          <button onClick={() => undoMutation.mutate(a.userId)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Undo check-in">
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {filteredAttendance.map((a) => (
              <div key={a.id} className={`bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 ${a.isFirstTime ? 'border-l-4 border-blue-400' : ''}`}>
                <Avatar name={`${a.user.firstName} ${a.user.lastName}`} id={a.user.id} className="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm">{a.user.firstName} {a.user.lastName}</p>
                  <p className="text-xs text-gray-400">{a.user.estate || a.user.phone}{a.isFirstTime ? ' · First visit' : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatTime(a.checkInTime)} · {checkInMethodLabels[a.checkInMethod] || a.checkInMethod}</p>
                </div>
                {!isServiceClosed && canManage && (
                  <button onClick={() => undoMutation.mutate(a.userId)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Undo2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close button for admin */}
      {!isServiceClosed && canClose && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setShowCloseDialog(true)} className="px-6 py-3 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors shadow-sm">
            Close Service ({attendance?.length || 0} checked in)
          </button>
        </div>
      )}

      {showVisitorForm && <VisitorForm serviceId={service.id} onClose={() => setShowVisitorForm(false)} />}
      {showCloseDialog && <CloseServiceDialog service={service} onClose={() => setShowCloseDialog(false)} />}
    </div>
  );
}

// ─── Main Services Page ──────────────────────────────────

export default function Services() {
  const { user } = useAuth();
  if (!user) return null;

  const userRole = user.role;
  const canManage = ['admin', 'pastor'].includes(userRole);
  const canView = ['admin', 'pastor', 'leader', 'usher', 'secretary'].includes(userRole);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRecord | null>(null);
  const [closeTarget, setCloseTarget] = useState<ServiceRecord | null>(null);

  useEffect(() => { setPage(1); }, [statusFilter]);

  const params = new URLSearchParams();
  if (statusFilter) params.set('status', statusFilter);
  params.set('page', String(page));
  params.set('limit', '50');

  const { data, isLoading } = useQuery({
    queryKey: ['services', params.toString()],
    queryFn: async () => {
      const res = await api.get(`/services?${params.toString()}`);
      return res.data as { data: ServiceRecord[]; pagination: any };
    },
    placeholderData: (prev) => prev,
    refetchInterval: selectedService ? 5_000 : false,
  });

  if (!canView) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Church className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Access Restricted</p>
        <p className="text-sm text-gray-400 mt-1">You do not have permission to view Services.</p>
      </div>
    );
  }

  // Check-in screen
  if (selectedService) {
    return (
      <CheckInScreen
        service={selectedService}
        onBack={() => setSelectedService(null)}
        userRole={userRole}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Services</h1>
        {canManage && (
          <button onClick={() => setShowStartDialog(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />Start New Service
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setStatusFilter('')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!statusFilter ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>All</button>
        <button onClick={() => setStatusFilter('active')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>Active</button>
        <button onClick={() => setStatusFilter('closed')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === 'closed' ? 'bg-gray-200 text-gray-800' : 'bg-white text-gray-600 hover:bg-gray-50 border'}`}>Closed</button>
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" /></div>
      ) : !data || data.data.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Church className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No services yet</p>
          <p className="text-sm text-gray-400 mt-1">Start your first Sunday service</p>
          {canManage && (
            <button onClick={() => setShowStartDialog(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              <Plus className="w-4 h-4" />Start Service
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="bg-white rounded-xl shadow-sm hidden sm:block">
            <ServiceTable
              services={data.data}
              onSelect={(s) => setSelectedService(s)}
              onClose={(s) => setCloseTarget(s)}
              canClose={canManage}
            />
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">
                  Showing {((page - 1) * data.pagination.limit) + 1}-{Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-sm text-gray-500">Page {page}</span>
                  <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {canManage && (
              <button onClick={() => setShowStartDialog(true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm mb-3">
                <Plus className="w-5 h-5" />Start Service
              </button>
            )}
            {data.data.map((s) => (
              <ServiceCard key={s.id} service={s} onSelect={(s) => setSelectedService(s)} canClose={canManage} onClose={(s) => setCloseTarget(s)} />
            ))}
            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-600 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="text-sm text-gray-500">Page {page}</span>
                <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages} className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-600 disabled:opacity-30">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showStartDialog && <StartServiceDialog onClose={() => setShowStartDialog(false)} />}
      {closeTarget && <CloseServiceDialog service={closeTarget} onClose={() => setCloseTarget(null)} />}
    </div>
  );
}
