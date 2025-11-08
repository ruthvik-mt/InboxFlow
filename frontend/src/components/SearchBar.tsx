import React, { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';

interface Props {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  loading: boolean;
  accounts: string[];
  folders: string[];
  selectedAccount: string;
  selectedFolder: string;
  selectedCategory: string;
  onAccountChange: (account: string) => void;
  onFolderChange: (folder: string) => void;
  onCategoryChange: (category: string) => void;
}

const SearchBar: React.FC<Props> = ({
  onSearch,
  onRefresh,
  loading,
  accounts,
  folders,
  selectedAccount,
  selectedFolder,
  selectedCategory,
  onAccountChange,
  onFolderChange,
  onCategoryChange,
}) => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    onSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search emails by subject, body, sender..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-white placeholder-gray-500"
          />
        </div>

        {/* Account Filter */}
        <select
          value={selectedAccount}
          onChange={(e) => onAccountChange(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
        >
          <option value="">All Accounts</option>
          {accounts.map(acc => (
            <option key={acc} value={acc}>{acc}</option>
          ))}
        </select>

        {/* Folder Filter */}
        <select
          value={selectedFolder}
          onChange={(e) => onFolderChange(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
        >
          <option value="">All Folders</option>
          {folders.map(folder => (
            <option key={folder} value={folder}>{folder}</option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-white"
        >
          <option value="">All Categories</option>
          <option value="Interested">Interested</option>
          <option value="Meeting Booked">Meeting Booked</option>
          <option value="Not Interested">Not Interested</option>
          <option value="Spam">Spam</option>
          <option value="Out of Office">Out of Office</option>
        </select>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
        >
          Search
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 border border-gray-700"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;