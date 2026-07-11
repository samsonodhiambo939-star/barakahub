import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import {
  Search, Plus, X, Filter, MoreVertical, ChevronLeft, ChevronRight,
  DollarSign, Menu, Download, FileText,
  Smartphone, Banknote, Landmark, CreditCard,
  CheckCircle, XCircle, AlertTriangle, Clock,
  MessageSquare, Printer
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

interface GivingCategory {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface Transaction {
  id: number;
  uuid: string;
  receiptNo: string | null;
  mpesaReceipt: string | null;
  userId: number | null;
  amount: number;
  categoryId: number;
  paymentMethod: string;
  transactionDate: string;
  recordedByUserId: number;
  referenceNote: string | null;
  serviceId: number | null;
  status: string;
  reversalId: number | null;
  voidReason: string | null;
  voidedAt: string | null;
  createdAt: string;
  user: { id: number; memberNo: string; firstName: string; lastName: string; phone: string; photoUrl: string | null } | null;
  category: { id: number; name: string };
  recordedBy: { id: number; firstName: string; lastName: string };
  reversals: { id: number; voidReason: string | null; voidedAt: string | null }[];
}

interface TransactionsResponse {
  data: Transaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  grandTotal: number;
}

interface Member {
  id: number;
  memberNo: string;
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string | null;
}

// ─── Helpers ─────────────────────────────────────────────

const methodConfig: Record<string, { label: string; icon: any; className: string }> = {
  cash: { label: 'Cash', icon: Banknote, className: 'bg-emerald-100 text-emerald-800' },
  bank: { label: 'Bank', icon: Landmark, className: 'bg-blue-100 text-blue-800' },
  mpesa_stk: { label: 'M-Pesa STK', icon: Smartphone, className: 'bg-green-100 text-green-800' },
  mpesa_c2b: { label: 'M-Pesa C2B', icon: Smartphone, className: 'bg-teal-100 text-teal-800' },
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'mpesa_stk', label: 'M-Pesa STK' },
  { value: 'mpesa_c2b', label: 'M-Pesa C2B' },
  { value: 'bank', label: 'Bank Transfer' },
];

const DATE_PRESETS = [
  { value: 'this_sunday', label: 'This Sunday' },
  { value: 'last_sunday', label: 'Last Sunday' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

function getSundayDate(weeksAgo = 0): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 0 : day;
  d.setDate(d.getDate() - diff - weeksAgo * 7);
  return d.toISOString().split('T')[0];
}

function formatCurrency(n: number): string {
  return `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

function getInitialsColor(id: number): string {
  const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  return colors[id % colors.length];
}

// ─── Shared Components ───────────────────────────────────

function Avatar({ name, id, className = 'w-9 h-9' }: { name: string; id: number; className?: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className={`${className} rounded-full ${getInitialsColor(id)} flex items-center justify-center text-white font-semibold text-xs shrink-0`}>
      {initials}
    </div>
  );
}

function StatusBadge({ status, voided }: { status: string; voided?: boolean }) {
  if (voided) {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Voided</span>;
  }
  const config: Record<string, { label: string; icon: any; className: string }> = {
    completed: { label: 'Completed', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-800' },
    pending: { label: 'Pending', icon: Clock, className: 'bg-amber-100 text-amber-800' },
    failed: { label: 'Failed', icon: AlertTriangle, className: 'bg-red-100 text-red-800' },
  };
  const c = config[status] || { label: status, icon: AlertTriangle, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      <c.icon className="w-3 h-3 mr-1" />{c.label}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const c = methodConfig[method] || { label: method, icon: CreditCard, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>
      <c.icon className="w-3 h-3" />{c.label}
    </span>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Member Select (searchable dropdown) ─────────────────

function MemberSelect({ value, onChange, disabled }: {
  value: number | null;
  onChange: (id: number | null, name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members-search', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20' });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const res = await api.get(`/members?${params.toString()}`);
      return res.data.data as Member[];
    },
    staleTime: 60_000,
  });

  const selectedName = value && members ? members.find((m) => m.id === value) : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-left focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50"
      >
        {selectedName ? (
          <>
            <Avatar name={`${selectedName.firstName} ${selectedName.lastName}`} id={selectedName.id} className="w-7 h-7 text-[10px]" />
            <span className="flex-1">{selectedName.firstName} {selectedName.lastName}</span>
            <span className="text-xs text-gray-400">{selectedName.phone}</span>
          </>
        ) : (
          <span className="text-gray-400 flex-1">Search member by name or phone...</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
            ) : !members?.length ? (
              <div className="p-4 text-center text-sm text-gray-400">No members found</div>
            ) : (
              members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.id, `${m.firstName} ${m.lastName}`); setOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-emerald-50 transition-colors ${value === m.id ? 'bg-emerald-50' : ''}`}
                >
                  <Avatar name={`${m.firstName} ${m.lastName}`} id={m.id} className="w-7 h-7 text-[10px]" />
                  <span className="flex-1 text-left">{m.firstName} {m.lastName}</span>
                  <span className="text-xs text-gray-400">{m.phone}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Action Menu ─────────────────────────────────────────

function ActionMenu({ transaction, onVoid, onSendSms, onPrint }: {
  transaction: Transaction;
  onVoid: (t: Transaction) => void;
  onSendSms: (t: Transaction) => void;
  onPrint: (t: Transaction) => void;
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

  const isVoided = transaction.voidedAt || transaction.reversals?.length > 0;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border z-50 py-1">
          <button onClick={() => { onPrint(transaction); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Printer className="w-4 h-4" />Print Receipt
          </button>
          <button onClick={() => { onSendSms(transaction); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <MessageSquare className="w-4 h-4" />Send SMS Receipt
          </button>
          {!isVoided && (
            <button onClick={() => { onVoid(transaction); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
              <XCircle className="w-4 h-4" />Void Transaction
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Transaction Table ───────────────────────────────────

function TransactionTable({ transactions, onVoid, onSendSms, onPrint, grandTotal }: {
  transactions: Transaction[];
  onVoid: (t: Transaction) => void;
  onSendSms: (t: Transaction) => void;
  onPrint: (t: Transaction) => void;
  grandTotal: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Receipt</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
            <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Method</th>
            <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
            <th className="py-3 px-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((t) => {
            const isVoided = !!t.voidedAt || t.reversals?.length > 0;
            return (
              <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${isVoided ? 'opacity-60' : ''}`}>
                <td className="py-3 px-3">
                  <div className="text-sm text-gray-800">{formatDate(t.transactionDate)}</div>
                  <div className="text-xs text-gray-400">{formatTime(t.transactionDate)}</div>
                </td>
                <td className="py-3 px-3 hidden lg:table-cell">
                  <code className="text-xs text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">{t.receiptNo || '-'}</code>
                </td>
                <td className="py-3 px-3">
                  {t.user ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={`${t.user.firstName} ${t.user.lastName}`} id={t.user.id} />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.user.firstName} {t.user.lastName}</p>
                        <p className="text-xs text-gray-400">{t.user.phone}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Anonymous</span>
                  )}
                </td>
                <td className="py-3 px-3 hidden md:table-cell">
                  <span className="text-sm text-gray-700">{t.category.name}</span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className="text-sm font-semibold text-gray-800">{formatCurrency(t.amount)}</span>
                </td>
                <td className="py-3 px-3 hidden lg:table-cell">
                  <MethodBadge method={t.paymentMethod} />
                </td>
                <td className="py-3 px-3 hidden sm:table-cell">
                  <StatusBadge status={t.status} voided={isVoided} />
                </td>
                <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu transaction={t} onVoid={onVoid} onSendSms={onSendSms} onPrint={onPrint} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td colSpan={4} className="py-3 px-3 text-sm font-semibold text-gray-700">Total (filtered)</td>
            <td className="py-3 px-3 text-right text-sm font-bold text-gray-800">{formatCurrency(grandTotal)}</td>
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Transaction Card (mobile) ───────────────────────────

function TransactionCard({ transaction, onVoid, onSendSms, onPrint }: {
  transaction: Transaction;
  onVoid: (t: Transaction) => void;
  onSendSms: (t: Transaction) => void;
  onPrint: (t: Transaction) => void;
}) {
  const isVoided = !!transaction.voidedAt || transaction.reversals?.length > 0;
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 ${isVoided ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {transaction.user ? (
            <>
              <Avatar name={`${transaction.user.firstName} ${transaction.user.lastName}`} id={transaction.user.id} />
              <div>
                <p className="font-medium text-gray-800 text-sm">{transaction.user.firstName} {transaction.user.lastName}</p>
                <p className="text-xs text-gray-400">{transaction.user.phone}</p>
              </div>
            </>
          ) : (
            <span className="text-sm text-gray-400">Anonymous</span>
          )}
        </div>
        <StatusBadge status={transaction.status} voided={isVoided} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          <p className="text-lg font-bold text-gray-800">{formatCurrency(transaction.amount)}</p>
          <p className="text-xs text-gray-500">{transaction.category.name} · <MethodBadge method={transaction.paymentMethod} /></p>
        </div>
        <ActionMenu transaction={transaction} onVoid={onVoid} onSendSms={onSendSms} onPrint={onPrint} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
        <span>{formatDate(transaction.transactionDate)}</span>
        <code>{transaction.receiptNo || '-'}</code>
      </div>
    </div>
  );
}

// ─── Void Dialog ─────────────────────────────────────────

function VoidDialog({ transaction, onClose }: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [pastorApproved, setPastorApproved] = useState(false);
  const [error, setError] = useState('');

  const voidMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/finance/transactions/${transaction!.id}/reverse`, { reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to void transaction');
    },
  });

  if (!transaction) return null;

  const needsApproval = transaction.amount > 10000;
  const canVoid = user && ['admin', 'pastor'].includes(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (reason.trim().length < 3) {
      setError('Please provide a reason (min 3 characters)');
      return;
    }
    if (needsApproval && !pastorApproved) {
      setError('Amount exceeds KSh 10,000 — Pastor approval is required');
      return;
    }
    voidMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            Void Transaction
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
            <p><span className="text-gray-500">Receipt:</span> <strong>{transaction.receiptNo || '-'}</strong></p>
            <p><span className="text-gray-500">Amount:</span> <strong>{formatCurrency(transaction.amount)}</strong></p>
            <p><span className="text-gray-500">Member:</span> {transaction.user ? `${transaction.user.firstName} ${transaction.user.lastName}` : 'Anonymous'}</p>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for voiding *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Explain why this transaction is being voided..."
            />
          </div>

          {needsApproval && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pastorApproved}
                onChange={(e) => setPastorApproved(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">
                Pastor approval obtained (amount exceeds KSh 10,000)
              </span>
            </label>
          )}

          {!canVoid && (
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm">
              Only admins and pastors can void transactions.
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={voidMutation.isPending || !canVoid}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {voidMutation.isPending ? 'Processing...' : 'Confirm Void'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Record Offering Slide-over ──────────────────────────

const emptyForm = {
  userId: null as number | null,
  memberName: '',
  amount: '',
  categoryId: 0,
  paymentMethod: 'cash',
  transactionDate: getSundayDate(0),
  referenceNote: '',
  serviceId: null as number | null,
};

function RecordOfferingForm({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [receiptNo, setReceiptNo] = useState('');

  const { data: categories } = useQuery({
    queryKey: ['giving-categories'],
    queryFn: async () => {
      const res = await api.get('/finance/categories');
      return res.data as GivingCategory[];
    },
    staleTime: 300_000,
  });

  useEffect(() => {
    api.get('/finance/transactions/next-receipt').then((res) => {
      setReceiptNo(res.data.receiptNo);
    }).catch(() => {});
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/finance/transactions', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to record transaction');
    },
  });

  const isMpesa = form.paymentMethod === 'mpesa_stk' || form.paymentMethod === 'mpesa_c2b';

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!form.categoryId) {
      setError('Please select a giving category');
      return;
    }

    const payload: any = {
      amount,
      categoryId: form.categoryId,
      paymentMethod: form.paymentMethod,
      transactionDate: form.transactionDate || undefined,
      referenceNote: form.referenceNote || undefined,
    };
    if (form.userId) payload.userId = form.userId;

    createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center sm:items-center pt-16 sm:pt-0 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:m-4 shadow-xl animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Record Offering
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-emerald-800 font-medium">Receipt No</span>
            <code className="text-sm font-bold text-emerald-700">{receiptNo || 'Generating...'}</code>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
            <MemberSelect
              value={form.userId}
              onChange={(id, name) => { setForm((prev) => ({ ...prev, userId: id, memberName: name })); }}
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank for anonymous donations</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">KSh</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => updateField('amount', e.target.value)}
                  required
                  className="w-full pl-12 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={form.categoryId}
                onChange={(e) => updateField('categoryId', parseInt(e.target.value))}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value={0}>Select...</option>
                {(categories || []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => updateField('paymentMethod', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
              <input
                type="date"
                value={form.transactionDate}
                onChange={(e) => updateField('transactionDate', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {isMpesa && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
                <Smartphone className="w-4 h-4" />
                <span className="font-medium">M-Pesa STK Push</span>
              </div>
              <p className="text-xs text-blue-600">
                STK Push will send a payment request to the member's phone. This feature is being integrated — for now, record the transaction manually after M-Pesa confirmation.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Notes</label>
            <textarea
              value={form.referenceNote}
              onChange={(e) => updateField('referenceNote', e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Optional note or reference..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Recording...' : 'Record Offering'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Filter Panel ────────────────────────────────────────

function FilterPanel({ categories, filters, onChange, onClose }: {
  categories: GivingCategory[];
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClose?: () => void;
}) {
  const [datePreset, setDatePreset] = useState('');

  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'this_sunday') {
      onChange('startDate', getSundayDate(0));
      onChange('endDate', getSundayDate(0));
    } else if (preset === 'last_sunday') {
      onChange('startDate', getSundayDate(1));
      onChange('endDate', getSundayDate(1));
    } else if (preset === 'this_month') {
      const now = new Date();
      onChange('startDate', new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      onChange('endDate', new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </h3>
        {onClose && <button onClick={onClose} className="lg:hidden p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</label>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => handleDatePreset(p.value)}
              className={`px-2 py-1.5 text-xs rounded border transition-colors ${datePreset === p.value ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="mt-2 space-y-2">
            <input type="date" value={filters.startDate || ''} onChange={(e) => onChange('startDate', e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs" />
            <input type="date" value={filters.endDate || ''} onChange={(e) => onChange('endDate', e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs" />
          </div>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
        <select
          value={filters.categoryId || ''}
          onChange={(e) => onChange('categoryId', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</label>
        <select
          value={filters.paymentMethod || ''}
          onChange={(e) => onChange('paymentMethod', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Methods</option>
          {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
        <select
          value={filters.status || ''}
          onChange={(e) => onChange('status', e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <button onClick={() => { onChange('clear', ''); setDatePreset(''); }} className="w-full py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
        Clear All Filters
      </button>
    </div>
  );
}

// ─── Main Finance Page ───────────────────────────────────

export default function Finance() {
  const { user } = useAuth();
  const canManage = user && ['admin', 'pastor'].includes(user.role);
  const canVoid = user && ['admin', 'pastor'].includes(user.role);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Transaction | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { setPage(1); }, [debouncedSearch, filters]);

  const queryParams = new URLSearchParams();
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (filters.categoryId) queryParams.set('categoryId', filters.categoryId);
  if (filters.paymentMethod) queryParams.set('paymentMethod', filters.paymentMethod);
  if (filters.status) queryParams.set('status', filters.status);
  if (filters.startDate) queryParams.set('startDate', filters.startDate);
  if (filters.endDate) queryParams.set('endDate', filters.endDate);
  queryParams.set('page', String(page));
  queryParams.set('limit', '50');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['transactions', queryParams.toString()],
    queryFn: async () => {
      const res = await api.get(`/finance/transactions?${queryParams.toString()}`);
      return res.data as TransactionsResponse;
    },
    placeholderData: (prev) => prev,
  });

  const { data: categories } = useQuery({
    queryKey: ['giving-categories'],
    queryFn: async () => {
      const res = await api.get('/finance/categories');
      return res.data as GivingCategory[];
    },
    staleTime: 300_000,
  });

  const updateFilter = (key: string, value: string) => {
    if (key === 'clear') { setFilters({}); return; }
    setFilters((prev) => {
      const next = { ...prev };
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  };

  const handleVoid = (t: Transaction) => {
    if (!canVoid) return;
    setVoidTarget(t);
  };

  const handleExportCsv = () => {
    if (!data?.data.length) return;
    const headers = ['Date', 'Receipt No', 'Member', 'Phone', 'Category', 'Amount', 'Method', 'Status', 'Recorded By'];
    const rows = data.data.map((t) => [
      formatDate(t.transactionDate),
      t.receiptNo || '',
      t.user ? `${t.user.firstName} ${t.user.lastName}` : 'Anonymous',
      t.user?.phone || '',
      t.category.name,
      t.amount.toFixed(2),
      t.paymentMethod,
      t.voidedAt ? 'Voided' : t.status,
      `${t.recordedBy.firstName} ${t.recordedBy.lastName}`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = (data?.data || []).map((t) => `
      <tr>
        <td>${formatDate(t.transactionDate)}</td>
        <td>${t.receiptNo || '-'}</td>
        <td>${t.user ? `${t.user.firstName} ${t.user.lastName}` : 'Anonymous'}</td>
        <td>${t.category.name}</td>
        <td style="text-align:right">${formatCurrency(t.amount)}</td>
        <td>${t.paymentMethod}</td>
        <td>${t.voidedAt ? 'Voided' : t.status}</td>
      </tr>`).join('');

    printWindow.document.write(`
      <html><head><title>Transactions Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: bold; }
        .total { font-weight: bold; text-align: right; padding: 12px; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 11px; }
      </style></head><body>
        <div class="header">
          <h1>BarakaHub Church</h1>
          <p>Transactions Report</p>
          <p>Generated: ${new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>
        </div>
        <table>
          <thead><tr><th>Date</th><th>Receipt</th><th>Member</th><th>Category</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">Grand Total: ${formatCurrency(data?.grandTotal || 0)}</div>
        <div class="footer">BarakaHub Church Management System</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!user || !['admin', 'pastor', 'leader'].includes(user.role)) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Access Restricted</p>
        <p className="text-sm text-gray-400 mt-1">You do not have permission to view the Finance section.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Finance</h1>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button onClick={handleExportCsv} className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />CSV
              </button>
              <button onClick={handleExportPdf} className="hidden sm:flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                <FileText className="w-4 h-4" />PDF
              </button>
            </>
          )}
          {canManage && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Record Offering
            </button>
          )}
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by receipt no, member name, or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-gray-400" /></button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`p-2.5 rounded-lg border transition-colors ${showFilters ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
          <Filter className="w-4 h-4" />
        </button>
        <button onClick={() => setShowFilters(true)} className="lg:hidden p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-6">
        {/* Filter sidebar - desktop */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="bg-white rounded-xl shadow-sm p-4 sticky top-6">
            <FilterPanel categories={categories || []} filters={filters} onChange={updateFilter} />
          </div>
        </div>

        {/* Filter drawer - mobile */}
        {showFilters && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowFilters(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl p-4 lg:hidden overflow-y-auto">
              <FilterPanel categories={categories || []} filters={filters} onChange={updateFilter} onClose={() => setShowFilters(false)} />
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
              <p className="text-red-600">Failed to load transactions. Please try again.</p>
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">Record your first Sunday offering</p>
              {canManage && (
                <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                  <Plus className="w-4 h-4" />Record Offering
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="bg-white rounded-xl shadow-sm hidden sm:block">
                <TransactionTable
                  transactions={data.data}
                  grandTotal={data.grandTotal}
                  onVoid={handleVoid}
                  onSendSms={() => {}}
                  onPrint={() => {}}
                />

                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Showing {((page - 1) * data.pagination.limit) + 1}-{Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total}
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === data.pagination.totalPages || Math.abs(p - page) <= 1)
                        .map((p, idx, arr) => (
                          <span key={p} className="flex items-center">
                            {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-300">...</span>}
                            <button onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm font-medium transition-colors ${p === page ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{p}</button>
                          </span>
                        ))}
                      <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages} className="p-1.5 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                <button onClick={() => setShowForm(true)} className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 shadow-sm">
                  <Plus className="w-5 h-5" />Record Offering
                </button>
                {data.data.map((t) => (
                  <TransactionCard key={t.id} transaction={t} onVoid={handleVoid} onSendSms={() => {}} onPrint={() => {}} />
                ))}
                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-600 disabled:opacity-30">
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>
                    <span className="text-sm text-gray-500">Page {page} of {data.pagination.totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))} disabled={page >= data.pagination.totalPages} className="flex items-center gap-1 px-3 py-2 text-sm text-emerald-600 disabled:opacity-30">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Record Offering slide-over */}
      {showForm && <RecordOfferingForm onClose={() => setShowForm(false)} onSuccess={() => setShowForm(false)} />}

      {/* Void dialog */}
      {voidTarget && <VoidDialog transaction={voidTarget} onClose={() => setVoidTarget(null)} />}
    </div>
  );
}
