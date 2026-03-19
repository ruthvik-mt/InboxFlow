import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Users,
  Inbox,
  ChevronRight,
  ShieldCheck,
  Menu,
  ArrowLeft,
  Trash2,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import EmailList from '../components/EmailList';
import EmailDetail from '../components/EmailDetail';
import StatsCards from '../components/StatsCards';
import SearchBar from '../components/SearchBar';
import AccountManager from '../components/AccountManager';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../contexts/AuthContext';
import { emailAPI } from '../services/api';
import { Email } from '../types';
import { cn } from '../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

const DeleteAccountModal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, loading }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-zinc-950 border border-zinc-800/50 rounded-3xl p-8 shadow-2xl grow-0"
          >
            <div className="absolute top-6 right-6">
              <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Delete Account?</h2>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                This will permanently remove your account and <span className="text-zinc-200 font-bold text-xs uppercase tracking-wider">all associated data</span>. This action cannot be undone.
              </p>

              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 mb-8 flex items-start gap-3 text-left">
                <AlertTriangle className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                  All synced emails, linked accounts, and search indexes will be wiped from our secure servers immediately.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="w-full bg-red-500 hover:bg-red-400 text-white py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Delete My Account"
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const Dashboard: React.FC = () => {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      await deleteAccount();
      toast.success('Account deleted successfully');
      navigate('/register');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const fetchEmails = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [emailData, statsData] = await Promise.all([
        emailAPI.fetchEmails({ size: 200 }),
        emailAPI.getEmailStats()
      ]);
      setEmails(emailData.emails || []);
      setStats(statsData.byCategory || {});
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      if (!isSilent) toast.error('Connection to sync service lost');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() && !selectedAccount && !selectedFolder && !selectedCategory) {
      fetchEmails();
      return;
    }

    setLoading(true);
    try {
      const data = await emailAPI.searchEmails({
        q: query,
        account: selectedAccount,
        folder: selectedFolder,
        label: selectedCategory
      });
      setEmails(data.emails || []);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error('Search index is temporarily unavailable');
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedFolder, selectedCategory, fetchEmails]);

  useEffect(() => {
    fetchEmails();

    const poll = async () => {
      await fetchEmails(true);
      pollingRef.current = setTimeout(poll, 30000);
    };

    pollingRef.current = setTimeout(poll, 30000);
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [fetchEmails]);

  // Derived filters
  useEffect(() => {
    if (searchQuery || selectedAccount || selectedFolder || selectedCategory) {
      handleSearch(searchQuery);
    } else {
      fetchEmails();
    }
  }, [selectedAccount, selectedFolder, selectedCategory, searchQuery, handleSearch, fetchEmails]);

  const accounts = Array.from(new Set(emails.map(e => e.accountEmail || e.account).filter(Boolean)));
  const folders = Array.from(new Set(emails.map(e => e.folder).filter(Boolean)));

  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: Inbox, active: !showAccountManager },
    { id: 'accounts', label: 'Accounts', icon: Users, active: showAccountManager },
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Premium Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: !isMobile ? 0 : (isSidebarOpen ? 0 : -300),
          opacity: 1
        }}
        className={cn(
          "fixed lg:relative w-[280px] lg:w-72 glass border-r border-white/5 flex flex-col z-50 h-full transition-all duration-300 transform lg:translate-x-0",
          !isSidebarOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="p-8">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setShowAccountManager(false)}>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
              <img src="/OneMail.png" alt="Logo" className="w-10 h-10 relative z-10" />
            </div>
            <div className={cn("overflow-hidden", isMobile ? "block" : "hidden lg:block")}>
              <h1 className="text-xl font-black tracking-tighter text-white">InboxFlow</h1>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase font-black text-gray-500 tracking-widest">AI Agent Active</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setShowAccountManager(item.id === 'accounts');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-500 group relative",
                item.active
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-5 h-5 transition-transform duration-500 group-hover:scale-110", item.active && "text-blue-400")} />
              <span className={cn("font-bold text-sm uppercase tracking-widest", isMobile ? "block" : "hidden lg:block")}>{item.label}</span>
              {item.active && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute inset-0 bg-blue-500/5 blur-xl -z-10"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <div className={cn("bg-zinc-800/20 rounded-2xl p-4 border border-white/5", isMobile ? "block" : "hidden lg:block")}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Privacy Mode</span>
            </div>
            <p className="text-[10px] text-gray-600 leading-relaxed font-bold">Your data is encrypted end-to-end and processed by AI.</p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-4 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded-2xl transition-all duration-300 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className={cn("font-bold text-sm uppercase tracking-widest", isMobile ? "block" : "hidden lg:block")}>Logout</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-4 px-5 py-4 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 rounded-2xl transition-all duration-300 group"
          >
            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className={cn("font-bold text-sm uppercase tracking-widest", isMobile ? "block" : "hidden lg:block")}>Delete Account</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#070707] relative overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 blur-[150px] rounded-full pointer-events-none" />

        {/* Global Toolbar */}
        <header className="h-20 md:h-24 px-4 md:px-10 flex items-center justify-between border-b border-white/5 bg-zinc-900/10 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-4 lg:hidden mr-4">
            {selectedEmail && !showAccountManager ? (
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-2 text-blue-400 hover:text-blue-300 flex items-center gap-1 group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                <span className="text-sm font-black uppercase tracking-widest hidden sm:inline">Back</span>
              </button>
            ) : (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-zinc-400 hover:text-white"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="flex-1 max-w-2xl">
            <SearchBar
              onSearch={handleSearch}
              onRefresh={() => fetchEmails()}
              loading={loading}
              accounts={accounts}
              folders={folders}
              selectedAccount={selectedAccount}
              selectedFolder={selectedFolder}
              selectedCategory={selectedCategory}
              onAccountChange={setSelectedAccount}
              onFolderChange={setSelectedFolder}
              onCategoryChange={setSelectedCategory}
            />
          </div>

          <div className="flex items-center gap-4 md:gap-8 ml-4 md:ml-10">
            <div className="flex items-center gap-3">
              <NotificationBell />
            </div>

            <div className="hidden md:block h-10 w-px bg-white/5" />

            <div className="flex items-center gap-4">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-black text-white uppercase tracking-widest">{user?.name}</div>
                <div className="text-[10px] text-zinc-500 font-bold lowercase tracking-tighter">{user?.email}</div>
              </div>
              <div className="relative group cursor-pointer">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-900 p-[1px]">
                  <div className="w-full h-full rounded-xl md:rounded-2xl bg-zinc-900 flex items-center justify-center text-zinc-100 font-black text-base md:text-lg group-hover:bg-blue-600 transition-all">
                    {user?.name?.charAt(0)}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-green-500 border-2 border-[#070707] rounded-full" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <AnimatePresence mode="wait">
            {showAccountManager ? (
              <motion.div
                key="management"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex-1 overflow-y-auto custom-scrollbar p-10"
              >
                <div className="max-w-6xl mx-auto">
                  <div className="mb-10 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em]">Management</span>
                    <ChevronRight className="w-3 h-3 text-zinc-700" />
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Account Configuration</span>
                  </div>
                  <AccountManager />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="inbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex-1 flex flex-col overflow-hidden p-4 md:p-10"
              >
                <StatsCards
                  stats={stats}
                  selectedCategory={selectedCategory}
                  onCategoryClick={setSelectedCategory}
                />

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 min-h-0 mt-4 md:mt-6">
                  {/* Feed - Hidden on mobile if email is selected */}
                  <div className={cn(
                    "lg:col-span-4 xl:col-span-3 flex flex-col min-h-0 bg-transparent",
                    selectedEmail && "hidden lg:flex"
                  )}>
                    <EmailList
                      emails={emails}
                      selectedEmail={selectedEmail}
                      onEmailSelect={setSelectedEmail}
                      loading={loading}
                    />
                  </div>

                  {/* Viewport - Hidden on mobile if NO email is selected */}
                  <div className={cn(
                    "lg:col-span-8 xl:col-span-9 flex flex-col min-h-0",
                    !selectedEmail && "hidden lg:flex"
                  )}>
                    <EmailDetail email={selectedEmail} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        loading={loading}
      />
    </div>
  );
};

export default Dashboard;
