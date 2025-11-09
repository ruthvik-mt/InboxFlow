import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Wifi, WifiOff, Settings, LogOut, X } from 'lucide-react';
import EmailList from '../components/EmailList';
import EmailDetail from '../components/EmailDetail';
import SearchBar from '../components/SearchBar';
import StatsCards from '../components/StatsCards';
import AccountManager from '../components/AccountManager';
import { useAuth } from '../contexts/AuthContext';
import { emailAPI } from '../services/api';
import { Email, StatsResponse } from '../types';

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showAccountManager, setShowAccountManager] = useState(false);

  // Filter states
  const [, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Unique accounts and folders
  const [accounts, setAccounts] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await emailAPI.fetchEmails({ size: 200 });
      setEmails(data.emails || []);

      // Extract unique accounts and folders
      const uniqueAccounts = Array.from(new Set(
        data.emails
          .map(e => e.accountEmail || e.account)
          .filter(Boolean)
      ));
      const uniqueFolders = Array.from(new Set(
        data.emails.map(e => e.folder).filter(Boolean)
      ));

      setAccounts(uniqueAccounts);
      setFolders(uniqueFolders);
      setIsOnline(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch emails');
      setIsOnline(false);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search emails
  const searchEmails = useCallback(async (query: string) => {
    if (!query && !selectedAccount && !selectedFolder && !selectedCategory) {
      fetchEmails();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: any = {};
      if (query) params.q = query;
      if (selectedAccount) params.account = selectedAccount;
      if (selectedFolder) params.folder = selectedFolder;
      if (selectedCategory) params.label = selectedCategory;

      const data = await emailAPI.searchEmails(params);
      setEmails(data.emails || []);
      setIsOnline(true);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedFolder, selectedCategory, fetchEmails]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await emailAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  }, []);

  // Filter emails locally
  useEffect(() => {
    let filtered = emails;

    if (selectedAccount) {
      filtered = filtered.filter(
        e => e.account === selectedAccount || e.accountEmail === selectedAccount
      );
    }
    if (selectedFolder) {
      filtered = filtered.filter(e => e.folder === selectedFolder);
    }
    if (selectedCategory) {
      filtered = filtered.filter(e => e.category === selectedCategory);
    }

    setFilteredEmails(filtered);
  }, [emails, selectedAccount, selectedFolder, selectedCategory]);

  // Initial load
  useEffect(() => {
    fetchEmails();
    fetchStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchEmails();
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchEmails, fetchStats]);

  const handleRefresh = () => {
    setSearchQuery('');
    setSelectedAccount('');
    setSelectedFolder('');
    setSelectedCategory('');
    fetchEmails();
    fetchStats();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Title Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/OneMail.png"
                alt="Logo"
                className="w-10 h-10"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">OneBox Dashboard</h1>
                <p className="text-sm text-gray-400">
                  {user?.name ? `Welcome, ${user.name}` : 'Email Management Console'}
                </p>
              </div>
            </div>

            {/* Status Indicators & Actions */}
            <div className="flex items-center gap-4">
              {/* Settings Button */}
              <button
                onClick={() => setShowAccountManager(true)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Manage Email Accounts"
              >
                <Settings className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>

              {/* Online Status */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                isOnline ? 'bg-green-900/30 text-green-400 border border-green-700' : 'bg-red-900/30 text-red-400 border border-red-700'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-medium">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium">Offline</span>
                  </>
                )}
              </div>

              {/* Queue Stats */}
              {stats?.ai && (
                <div className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">
                  <span className="text-sm text-gray-300">
                    <span className="font-medium">AI Queue:</span>{' '}
                    {stats.ai.queueLength || stats.cerebras?.queueLength || 0}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <SearchBar
            onSearch={searchEmails}
            onRefresh={handleRefresh}
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Cards */}
        <StatsCards
          emails={filteredEmails}
          selectedCategory={selectedCategory}
          onCategoryClick={setSelectedCategory}
        />

        {/* Email Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Email List */}
          <div className="lg:col-span-1">
            <EmailList
              emails={filteredEmails}
              selectedEmail={selectedEmail}
              onEmailSelect={setSelectedEmail}
              loading={loading}
            />
          </div>

          {/* Email Detail */}
          <div className="lg:col-span-2">
            <EmailDetail email={selectedEmail} />
          </div>
        </div>
      </main>

      {/* Account Manager Modal */}
      {showAccountManager && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900 z-10">
              <h2 className="text-2xl font-bold">Manage Email Accounts</h2>
              <button
                onClick={() => setShowAccountManager(false)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <AccountManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;