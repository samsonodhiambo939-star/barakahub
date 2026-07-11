import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { DollarSign } from 'lucide-react';

interface Transaction {
  id: number; receiptNo: string | null; amount: number; paymentMethod: string;
  transactionDate: string; status: string; category: { name: string };
}

interface GivingSummary {
  total: number; byCategory: { name: string; total: number; count: number }[];
  byMethod: { method: string; total: number }[];
  transactions: Transaction[];
  count: number;
}

function formatCurrency(v: number) { return `KSh ${v.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`; }
function formatDate(d: string) { return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }); }

const YEAR_FILTERS = [
  { label: 'This Year', value: new Date().getFullYear() },
  { label: 'Last Year', value: new Date().getFullYear() - 1 },
];

export default function PortalGiving() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'giving', year],
    queryFn: () => api.get(`/finance/my-giving?startDate=${year}-01-01&endDate=${year}-12-31`).then(r => r.data as GivingSummary),
    staleTime: 30_000,
  });

  const transactions = data?.transactions || [];
  const filtered = categoryFilter === 'all' ? transactions : transactions.filter(t => t.category.name === categoryFilter);

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-20 bg-white rounded-xl" />
        {[1,2,3].map(i => <div key={i} className="h-14 bg-white rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white">
        <p className="text-sm text-emerald-100">Total Giving {year}</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(total)}</p>
        <p className="text-xs text-emerald-200 mt-1">{data?.count || 0} contributions</p>
      </div>

      {/* Category Breakdown */}
      {data && data.byCategory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">By Category</p>
          <div className="space-y-2">
            {data.byCategory.map(c => (
              <div key={c.name} className="flex justify-between text-sm">
                <span className="text-gray-600">{c.name}</span>
                <span className="font-medium text-gray-800">{formatCurrency(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {YEAR_FILTERS.map(y => (
          <button
            key={y.value}
            onClick={() => setYear(y.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
              year === y.value ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {y.label}
          </button>
        ))}
        {data && data.byCategory.length > 1 && (
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm ml-auto">
            <option value="all">All</option>
            {data.byCategory.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Transactions */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(tx => (
            <div key={tx.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{formatCurrency(tx.amount)}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span>{tx.category.name}</span>
                    <span>·</span>
                    <span>{formatDate(tx.transactionDate)}</span>
                    {tx.receiptNo && <span>· #{tx.receiptNo}</span>}
                  </div>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {tx.paymentMethod === 'mpesa_stk' || tx.paymentMethod === 'mpesa_c2b' ? 'M-Pesa' : tx.paymentMethod}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <DollarSign className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No giving records for {year}</p>
        </div>
      )}
    </div>
  );
}
