import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Power, Mail, Server } from 'lucide-react';
import api from '../services/api';

interface EmailAccount {
  _id: string;
  email: string;
  accountName: string;
  imapHost: string;
  imapPort: number;
  isActive: boolean;
  lastSyncedAt?: string;
}

const AccountManager: React.FC = () => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    accountName: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      setAccounts(response.data.accounts);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/accounts', formData);
      await fetchAccounts();
      setShowForm(false);
      setFormData({
        email: '',
        password: '',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        accountName: '',
      });
      window.alert('Account added successfully! It will start syncing shortly.');
    } catch (err: any) {
      window.alert(err.response?.data?.error || 'Failed to add account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Fixed: Use window.confirm instead of bare confirm
    if (!window.confirm('Are you sure you want to delete this account?')) return;

    try {
      await api.delete(`/accounts/${id}`);
      await fetchAccounts();
      window.alert('Account deleted successfully!');
    } catch (err) {
      window.alert('Failed to delete account');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/accounts/${id}/toggle`);
      await fetchAccounts();
    } catch (err) {
      window.alert('Failed to toggle account');
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Email Accounts</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Name
              </label>
              <input
                type="text"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                placeholder="Work Email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password / App Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IMAP Host
              </label>
              <input
                type="text"
                value={formData.imapHost}
                onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                placeholder="imap.gmail.com"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IMAP Port
              </label>
              <input
                type="number"
                value={formData.imapPort}
                onChange={(e) => setFormData({ ...formData, imapPort: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
                placeholder="993"
                required
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>For Gmail:</strong> Use an App Password (Google Account → Security → 2-Step Verification → App Passwords)
            </p>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No email accounts connected</p>
            <p className="text-sm mt-2">Click "Add Account" to get started</p>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account._id}
              className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${account.isActive ? 'bg-green-400' : 'bg-gray-600'}`} />
                <div>
                  <div className="font-medium text-white">{account.accountName}</div>
                  <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {account.email}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                    <Server className="w-3 h-3" />
                    {account.imapHost}:{account.imapPort}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(account._id)}
                  className={`p-2 rounded-lg transition-colors ${
                    account.isActive
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={account.isActive ? 'Disable' : 'Enable'}
                >
                  <Power className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => handleDelete(account._id)}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AccountManager;