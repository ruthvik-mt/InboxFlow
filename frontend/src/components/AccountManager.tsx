import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Power, Mail, Server, Shield, X, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

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
  const [initialLoading, setInitialLoading] = useState(true);
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
    } finally {
      setInitialLoading(false);
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
      toast.success('Account synchronized successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to sync account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('This will stop AI processing and delete indexing for this account. Continue?')) return;

    try {
      await api.delete(`/accounts/${id}`);
      await fetchAccounts();
      toast.success('Account record removed');
    } catch (err) {
      toast.error('Failed to remove account');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/accounts/${id}/toggle`);
      await fetchAccounts();
      toast.success('Agent status updated');
    } catch (err) {
      toast.error('Failed to update agent status');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter">Connected Accounts</h2>
          <p className="text-zinc-500 text-[10px] md:text-sm font-bold uppercase tracking-widest mt-1">Manage email synchronization nodes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={cn(
            "w-full sm:w-auto group relative px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all duration-300",
            showForm ? "bg-zinc-800 text-zinc-400" : "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-105"
          )}
        >
          <div className="flex items-center gap-2">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Close Form' : 'Add Connection'}
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            onSubmit={handleSubmit}
            className="glass rounded-3xl p-8 space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] -z-10" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Friendly Name</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500/50 transition-all font-bold"
                  placeholder="e.g. Work Inbox"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500/50 transition-all font-bold"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">App Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500/50 transition-all font-bold"
                  placeholder="••••••••••••••••"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">IMAP Host</label>
                  <input
                    type="text"
                    value={formData.imapHost}
                    onChange={(e) => setFormData({ ...formData, imapHost: e.target.value })}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500/50 transition-all font-bold"
                    placeholder="imap.gmail.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Port</label>
                  <input
                    type="number"
                    value={formData.imapPort}
                    onChange={(e) => setFormData({ ...formData, imapPort: Number(e.target.value) })}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white outline-none focus:border-blue-500/50 transition-all font-bold"
                    placeholder="993"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                {loading ? 'Validating Credentials...' : 'Establish Connection'}
              </button>

              <div className="flex items-center gap-3 px-6 py-4 bg-zinc-800/20 rounded-2xl border border-white/5">
                <Shield className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider leading-tight">Credentials are encrypted with AES-256 before storage</span>
              </div>
            </div>

            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/60 leading-relaxed">
                <strong>Important:</strong> For most providers like Gmail or Outlook, you MUST use an dedicated <strong>App Password</strong> rather than your account login password.
              </p>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {initialLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin opacity-50" />
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-4">Syncing Agent Status...</p>
            </div>
          ) : accounts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 glass rounded-3xl border-dashed flex flex-col items-center justify-center text-center px-10"
            >
              <div className="bg-zinc-800/30 p-8 rounded-full mb-6 relative">
                <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-2xl animate-pulse" />
                <Mail className="w-16 h-16 text-zinc-700 relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Active Email Accounts</h3>
              <p className="text-zinc-500 text-sm max-w-xs font-medium">Connect your first email account to start the AI classification engine.</p>
            </motion.div>
          ) : (
            accounts.map((account) => (
              <motion.div
                layout
                key={account._id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                className={cn(
                  "glass p-6 rounded-3xl flex flex-col justify-between group transition-all duration-500",
                  account.isActive ? "border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.03)]" : "opacity-60"
                )}
              >
                <div>
                  <div className="flex items-start justify-between mb-6 relative">
                    <div className={cn(
                      "p-3 rounded-2xl transition-colors duration-500",
                      account.isActive ? "bg-blue-600/10 text-blue-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <Mail className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2 absolute top-0 right-0">
                      <button
                        onClick={() => handleToggle(account._id)}
                        className={cn(
                          "p-2.5 rounded-xl transition-all",
                          account.isActive ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-zinc-800 text-zinc-500"
                        )}
                        title={account.isActive ? 'Active' : 'Offline'}
                      >
                        {account.isActive ? <Check className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      <AnimatePresence>
                        <button
                          onClick={() => handleDelete(account._id)}
                          className="p-2.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                          title="Remove Node"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-lg font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight">{account.accountName}</h4>
                    <p className="text-xs text-zinc-500 font-bold mt-1 truncate">{account.email}</p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Server className="w-3 h-3" />
                      <span>{account.imapHost}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AccountManager;
