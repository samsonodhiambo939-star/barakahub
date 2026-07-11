import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Search, Plus, X, Filter, MoreVertical,
  Mail, Phone, MapPin, Calendar, User, Users,
  Edit2, Trash2, MessageSquare, DollarSign,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';

interface Member {
  id: number;
  memberNo: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  gender: string;
  maritalStatus: string | null;
  estate: string | null;
  role: string;
  status: string;
  isActive: boolean;
  photoUrl: string | null;
  joinDate: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface MemberDetail extends Member {
  uuid: string;
  idNumber: string | null;
  dob: string | null;
  physicalAddress: string | null;
  baptismDate: string | null;
  familiesHeaded: any[];
  familyMembers: any[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MembersResponse {
  data: Member[];
  pagination: Pagination;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600' },
  transferred: { label: 'Transferred', className: 'bg-blue-100 text-blue-800' },
  deceased: { label: 'Deceased', className: 'bg-red-100 text-red-800' },
};

const roleConfig: Record<string, string> = {
  admin: 'Admin',
  pastor: 'Pastor',
  leader: 'Leader',
  usher: 'Usher',
  member: 'Member',
};

const genderOptions = [
  { value: '', label: 'All' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'deceased', label: 'Deceased' },
];

const roleOptions = [
  { value: '', label: 'All Roles' },
  { value: 'member', label: 'Member' },
  { value: 'usher', label: 'Usher' },
  { value: 'leader', label: 'Leader' },
  { value: 'pastor', label: 'Pastor' },
  { value: 'admin', label: 'Admin' },
];

function MemberAvatar({ member, className = 'w-10 h-10' }: { member: Member; className?: string }) {
  const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const color = colors[member.id % colors.length];

  return (
    <div className={`${className} rounded-full ${color} flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
      {initials}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function ActionMenu({ member, onEdit, onDeactivate, onSendSms, onViewGiving }: {
  member: Member;
  onEdit: (m: Member) => void;
  onDeactivate: (m: Member) => void;
  onSendSms: (m: Member) => void;
  onViewGiving: (m: Member) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { icon: Edit2, label: 'Edit', onClick: () => { onEdit(member); setOpen(false); } },
    { icon: MessageSquare, label: 'Send SMS', onClick: () => { onSendSms(member); setOpen(false); } },
    { icon: DollarSign, label: 'View Giving', onClick: () => { onViewGiving(member); setOpen(false); } },
    { icon: Trash2, label: 'Deactivate', onClick: () => { onDeactivate(member); setOpen(false); }, danger: true },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border z-50 py-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberFilters({ estates, filters, onChange, onClose }: {
  estates: string[];
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClose?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </h3>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
        <select
          value={filters.status || ''}
          onChange={(e) => onChange('status', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</label>
        <select
          value={filters.gender || ''}
          onChange={(e) => onChange('gender', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {genderOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role</label>
        <select
          value={filters.role || ''}
          onChange={(e) => onChange('role', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          {roleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estate</label>
        <select
          value={filters.estate || ''}
          onChange={(e) => onChange('estate', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Estates</option>
          {estates.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <button
        onClick={() => { onChange('clear', ''); }}
        className="w-full py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
      >
        Clear All Filters
      </button>
    </div>
  );
}

function MemberTable({ members, onSelect, onEdit, onDeactivate, onSendSms, onViewGiving }: {
  members: Member[];
  onSelect: (m: Member) => void;
  onEdit: (m: Member) => void;
  onDeactivate: (m: Member) => void;
  onSendSms: (m: Member) => void;
  onViewGiving: (m: Member) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Estate</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="py-3 px-4 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {members.map((member) => (
            <tr
              key={member.id}
              onClick={() => onSelect(member)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <MemberAvatar member={member} />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{member.firstName} {member.lastName}</p>
                    <p className="text-xs text-gray-400">{member.memberNo}</p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 text-sm text-gray-600 hidden md:table-cell">{member.phone}</td>
              <td className="py-3 px-4 text-sm text-gray-600 hidden lg:table-cell">{member.estate || '-'}</td>
              <td className="py-3 px-4 hidden sm:table-cell">
                <span className="text-xs text-gray-500">{roleConfig[member.role] || member.role}</span>
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={member.status} />
              </td>
              <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                <ActionMenu
                  member={member}
                  onEdit={onEdit}
                  onDeactivate={onDeactivate}
                  onSendSms={onSendSms}
                  onViewGiving={onViewGiving}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberCard({ member, onSelect, onEdit, onDeactivate }: {
  member: Member;
  onSelect: (m: Member) => void;
  onEdit: (m: Member) => void;
  onDeactivate: (m: Member) => void;
}) {
  return (
    <div
      onClick={() => onSelect(member)}
      className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
    >
      <MemberAvatar member={member} className="w-12 h-12" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800">{member.firstName} {member.lastName}</p>
        <p className="text-sm text-gray-500">{member.phone}</p>
        {member.estate && <p className="text-xs text-gray-400">{member.estate}</p>}
        <div className="mt-1.5 flex items-center gap-2">
          <StatusBadge status={member.status} />
          <span className="text-xs text-gray-400">{roleConfig[member.role] || member.role}</span>
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <ActionMenu
          member={member}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onSendSms={() => {}}
          onViewGiving={() => {}}
        />
      </div>
    </div>
  );
}

function ProfileDrawer({ memberId, onClose, onEdit }: {
  memberId: number | null;
  onClose: () => void;
  onEdit: (m: MemberDetail) => void;
}) {
  const { data: member, isLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const res = await api.get(`/members/${memberId}`);
      return res.data as MemberDetail;
    },
    enabled: !!memberId,
  });

  if (!memberId) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-xl transform transition-transform lg:translate-x-0 ${memberId ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-gray-800">Member Profile</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : member ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 text-center border-b">
                <MemberAvatar member={member} className="w-20 h-20 mx-auto text-lg" />
                <h3 className="mt-3 text-lg font-semibold text-gray-800">{member.firstName} {member.lastName}</h3>
                <p className="text-sm text-gray-500">{member.memberNo}</p>
                <div className="mt-2">
                  <StatusBadge status={member.status} />
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={() => onEdit(member)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <Section title="Contact">
                  <InfoRow icon={Phone} label="Phone" value={member.phone} />
                  <InfoRow icon={Mail} label="Email" value={member.email || '-'} />
                </Section>

                <Section title="Personal">
                  <InfoRow icon={User} label="Gender" value={member.gender} />
                  <InfoRow icon={User} label="ID Number" value={member.idNumber || '-'} />
                  <InfoRow icon={Calendar} label="Date of Birth" value={member.dob ? new Date(member.dob).toLocaleDateString() : '-'} />
                  <InfoRow icon={Users} label="Marital Status" value={member.maritalStatus || '-'} />
                  <InfoRow icon={User} label="Role" value={roleConfig[member.role] || member.role} />
                </Section>

                <Section title="Address">
                  <InfoRow icon={MapPin} label="Estate" value={member.estate || '-'} />
                  <InfoRow icon={MapPin} label="Address" value={member.physicalAddress || '-'} />
                </Section>

                <Section title="Church">
                  <InfoRow icon={Calendar} label="Joined" value={member.joinDate ? new Date(member.joinDate).toLocaleDateString() : '-'} />
                  <InfoRow icon={Calendar} label="Baptism" value={member.baptismDate ? new Date(member.baptismDate).toLocaleDateString() : '-'} />
                  <InfoRow icon={Calendar} label="Last Login" value={member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'} />
                </Section>

                {member.familiesHeaded?.length > 0 && (
                  <Section title="Families">
                    {member.familiesHeaded.map((f: any) => (
                      <div key={f.id} className="text-sm text-gray-600">
                        <p className="font-medium">{f.familyName}</p>
                        <p className="text-xs text-gray-400">{f.members?.length || 0} members</p>
                      </div>
                    ))}
                  </Section>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-gray-500 min-w-[80px]">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}

const emptyForm = {
  firstName: '', lastName: '', phone: '', email: '', idNumber: '',
  gender: 'male' as const, dob: '', maritalStatus: 'single' as const,
  physicalAddress: '', estate: '',
};

function MemberForm({ member, onClose, onSuccess }: {
  member?: Member | MemberDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const isEdit = !!member;

  useEffect(() => {
    if (member) {
      setForm({
        firstName: member.firstName,
        lastName: member.lastName,
        phone: member.phone,
        email: member.email || '',
        idNumber: (member as any).idNumber || '',
        gender: (member as any).gender || 'male',
        dob: (member as any).dob ? (member as any).dob.split('T')[0] : '',
        maritalStatus: (member as any).maritalStatus || 'single',
        physicalAddress: (member as any).physicalAddress || '',
        estate: member.estate || '',
      });
    }
  }, [member]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.post('/members', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member created successfully');
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to create member');
      toast.error(err.response?.data?.error || 'Failed to create member');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await api.put(`/members/${member!.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['member', member!.id] });
      toast.success('Member updated successfully');
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to update member');
      toast.error(err.response?.data?.error || 'Failed to update member');
    },
  });

  const updateField = (key: string, value: string) => {
    if (key === 'firstName' || key === 'lastName') {
      value = value.replace(/[^a-zA-Z\s-]/g, '');
    }
    setForm((prev) => ({ ...prev, [key]: key === 'phone' ? value.replace(/[^0-9+]/g, '') : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const phone = form.phone.startsWith('0') ? `254${form.phone.slice(1)}` : form.phone.startsWith('+') ? form.phone.slice(1) : form.phone;
    if (!/^(254)[17]\d{8}$/.test(phone)) {
      setError('Valid Kenyan phone required (e.g. 2547XXXXXXXX)');
      return;
    }

    const payload = { ...form, phone };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center sm:items-center pt-16 sm:pt-0 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:m-4 shadow-xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-gray-800">{isEdit ? 'Edit Member' : 'Add Member'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                value={form.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                value={form.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="2547XXXXXXXX"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
              <input
                value={form.idNumber}
                onChange={(e) => updateField('idNumber', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="12345678"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => updateField('gender', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
              <select
                value={form.maritalStatus}
                onChange={(e) => updateField('maritalStatus', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => updateField('dob', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estate</label>
              <input
                value={form.estate}
                onChange={(e) => updateField('estate', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="e.g. Kasarani"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
            <input
              value={form.physicalAddress}
              onChange={(e) => updateField('physicalAddress', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="House number, street"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving...' : isEdit ? 'Update Member' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Members() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canManage = user && ['admin', 'pastor'].includes(user.role);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, filters]);

  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.role) queryParams.set('role', filters.role);
  if (filters.estate) queryParams.set('estate', filters.estate);
  if (filters.gender) queryParams.set('gender', filters.gender);
  queryParams.set('page', String(page));
  queryParams.set('limit', '50');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['members', queryParams.toString()],
    queryFn: async () => {
      const res = await api.get(`/members?${queryParams.toString()}`);
      return res.data as MembersResponse;
    },
    placeholderData: (prev) => prev,
  });

  const estates = [...new Set((data?.data || []).map((m) => m.estate).filter(Boolean) as string[])];

  const updateFilter = (key: string, value: string) => {
    if (key === 'clear') {
      setFilters({});
      return;
    }
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member deactivated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to deactivate');
    },
  });

  const handleDeactivate = (member: Member) => {
    if (confirm(`Deactivate ${member.firstName} ${member.lastName}?`)) {
      deactivateMutation.mutate(member.id);
    }
  };

  const handleEdit = (member: Member | MemberDetail) => {
    setEditingMember(member);
    setShowForm(true);
    setSelectedMemberId(null);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Members</h1>
        {canManage && (
          <button
            onClick={() => { setEditingMember(null); setShowForm(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members by name, phone, or estate..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-lg border transition-colors ${showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
        >
          <Filter className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowFilters(true)}
          className="lg:hidden p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar - desktop */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-4 sticky top-6">
            <MemberFilters estates={estates} filters={filters} onChange={updateFilter} />
          </div>
        </div>

        {/* Filter drawer - mobile */}
        {showFilters && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowFilters(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl p-4 lg:hidden overflow-y-auto">
              <MemberFilters estates={estates} filters={filters} onChange={updateFilter} onClose={() => setShowFilters(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {isLoading && !data ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
            </div>
          ) : isError ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <p className="text-red-600">Failed to load members. Please try again.</p>
            </div>
          ) : data && data.data.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No members found</p>
              <p className="text-sm text-gray-400 mt-1">Add your first member to get started</p>
              {canManage && (
                <button
                  onClick={() => { setEditingMember(null); setShowForm(true); }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Member
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="bg-white rounded-xl shadow-sm hidden sm:block">
                <MemberTable
                  members={data?.data || []}
                  onSelect={(m) => setSelectedMemberId(m.id)}
                  onEdit={handleEdit}
                  onDeactivate={handleDeactivate}
                  onSendSms={() => {}}
                  onViewGiving={() => {}}
                />

                {/* Pagination */}
                {data && data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Showing {((page - 1) * data.pagination.limit) + 1}-{Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === data.pagination.totalPages || Math.abs(p - page) <= 1)
                        .map((p, idx, arr) => (
                          <span key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-300">...</span>}
                            <button
                              onClick={() => setPage(p)}
                              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${p === page ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                              {p}
                            </button>
                          </span>
                        ))}
                      <button
                        onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                        disabled={page >= data.pagination.totalPages}
                        className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {(data?.data || []).map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onSelect={(m) => setSelectedMemberId(m.id)}
                    onEdit={handleEdit}
                    onDeactivate={handleDeactivate}
                  />
                ))}

                {data && data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-600 disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-sm text-gray-500">Page {page} of {data.pagination.totalPages}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                      disabled={page >= data.pagination.totalPages}
                      className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-600 disabled:opacity-30"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Profile drawer */}
      <ProfileDrawer memberId={selectedMemberId} onClose={() => setSelectedMemberId(null)} onEdit={handleEdit} />

      {/* Add/Edit form slide-over */}
      {showForm && (
        <MemberForm
          member={editingMember}
          onClose={() => { setShowForm(false); setEditingMember(null); }}
          onSuccess={() => { setShowForm(false); setEditingMember(null); }}
        />
      )}
    </div>
  );
}
