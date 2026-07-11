import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { User, Phone, Mail, MapPin, Save, Lock } from 'lucide-react';

export default function PortalProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState('');
  const [estate, setEstate] = useState(user?.estate || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');


  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put('/portal/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal'] });
      toast.success('Profile updated');
      setEditMode(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Update failed');
    },
  });

  const pwdMutation = useMutation({
    mutationFn: (data: any) => api.post('/portal/change-password', data),
    onSuccess: () => {
      toast.success('Password changed');
      setCurrentPassword('');
      setNewPassword('');
      setShowPwd(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Password change failed');
    },
  });

  const handleSave = () => {
    const data: any = {};
    if (phone !== user?.phone) data.phone = phone;
    if (email) data.email = email;
    if (estate !== user?.estate) data.estate = estate;
    if (Object.keys(data).length === 0) {
      setEditMode(false);
      return;
    }
    updateMutation.mutate(data);
  };

  const handlePwdChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    pwdMutation.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div className="flex flex-col items-center py-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
          {user?.photoUrl ? (
            <img src={user.photoUrl} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-emerald-500" />
          )}
        </div>
        <p className="text-lg font-semibold text-gray-800">{user?.firstName} {user?.lastName}</p>
        <p className="text-xs text-gray-400">{user?.memberNo}</p>
      </div>

      {/* Profile Fields */}
      <div className="bg-white rounded-xl shadow-sm divide-y">
        <div className="p-4 flex justify-between">
          <div><p className="text-xs text-gray-400">Name</p><p className="text-sm text-gray-800">{user?.firstName} {user?.lastName}</p></div>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400">Phone</p>
          {editMode ? (
            <div className="flex items-center gap-2 mt-1">
              <Phone className="w-4 h-4 text-gray-400" />
              <input value={phone} onChange={e => setPhone(e.target.value)} className="flex-1 border-b text-sm py-1 focus:outline-none focus:border-emerald-500" />
            </div>
          ) : (
            <p className="text-sm text-gray-800">{user?.phone}</p>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400">Email</p>
          {editMode ? (
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-gray-400" />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="flex-1 border-b text-sm py-1 focus:outline-none focus:border-emerald-500" placeholder="your@email.com" />
            </div>
          ) : (
            <p className="text-sm text-gray-800">{user?.email || '—'}</p>
          )}
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400">Estate</p>
          {editMode ? (
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4 text-gray-400" />
              <input value={estate} onChange={e => setEstate(e.target.value)} className="flex-1 border-b text-sm py-1 focus:outline-none focus:border-emerald-500" />
            </div>
          ) : (
            <p className="text-sm text-gray-800">{user?.estate || '—'}</p>
          )}
        </div>
      </div>

      {/* Save / Edit Buttons */}
      {editMode ? (
        <div className="flex gap-3">
          <button onClick={() => setEditMode(false)} className="flex-1 py-3 border rounded-xl text-sm font-medium text-gray-600">Cancel</button>
          <button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" /> {updateMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      ) : (
        <button onClick={() => setEditMode(true)} className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
          Edit Profile
        </button>
      )}

      {/* Change Password */}
      <button onClick={() => setShowPwd(!showPwd)} className="w-full py-3 border rounded-xl text-sm font-medium text-gray-600 flex items-center justify-center gap-2">
        <Lock className="w-4 h-4" /> Change Password
      </button>

      {showPwd && (
        <form onSubmit={handlePwdChange} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" placeholder="Current password" className="w-full border rounded-lg px-3 py-2 text-sm" required />
          <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="New password (min 6 chars)" className="w-full border rounded-lg px-3 py-2 text-sm" required minLength={6} />
          <button type="submit" disabled={pwdMutation.isPending} className="w-full py-2 bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {pwdMutation.isPending ? 'Changing...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}
