import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import { DollarSign, Users, Church, TrendingUp } from 'lucide-react';

interface DashboardData {
  monthlyTotal: number;
  memberCount: number;
  recentTransactions: any[];
  attendanceToday: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    monthlyTotal: 0,
    memberCount: 0,
    recentTransactions: [],
    attendanceToday: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const now = new Date();
        const [financeRes, membersRes] = await Promise.all([
          api.get(`/finance/reports/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
          api.get('/members?limit=5'),
        ]);
        setData({
          monthlyTotal: financeRes.data.total || 0,
          memberCount: membersRes.data.pagination?.total || 0,
          recentTransactions: financeRes.data.byCategory ? [] : [],
          attendanceToday: 0,
        });
      } catch (err) {
        // Handle errors silently for now
      }
    };
    load();
  }, []);

  const stats = [
    { label: 'Monthly Giving', value: `KSh ${data.monthlyTotal.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Total Members', value: data.memberCount.toLocaleString(), icon: Users, color: 'bg-blue-500' },
    { label: 'Attendance Today', value: data.attendanceToday.toLocaleString(), icon: Church, color: 'bg-purple-500' },
    { label: 'Giving Trend', value: 'View Report', icon: TrendingUp, color: 'bg-amber-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome, {user?.firstName}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-emerald-50 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors text-left">
              <p className="font-medium">Give</p>
              <p className="text-sm text-emerald-600">Make a contribution</p>
            </button>
            <button className="p-4 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors text-left">
              <p className="font-medium">My Statement</p>
              <p className="text-sm text-blue-600">Download giving statement</p>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors text-left">
              <p className="font-medium">Prayer Request</p>
              <p className="text-sm text-purple-600">Submit a prayer request</p>
            </button>
            <button className="p-4 bg-amber-50 rounded-lg text-amber-700 hover:bg-amber-100 transition-colors text-left">
              <p className="font-medium">Events</p>
              <p className="text-sm text-amber-600">Upcoming church events</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
          <p className="text-gray-500 text-sm">No recent activity to display.</p>
        </div>
      </div>
    </div>
  );
}
