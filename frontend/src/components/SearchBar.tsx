import React, { useState } from 'react';
import { Search, RefreshCw, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

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

interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (val: string) => void;
}

const CustomDropdown: React.FC<DropdownProps> = ({ label, value, options, placeholder, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">{label}</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-4 py-2.5 bg-gray-900 border rounded-2xl text-sm text-left transition-all duration-300 flex items-center justify-between group",
            isOpen ? "border-blue-500 ring-4 ring-blue-500/10" : "border-white/10 hover:border-white/20"
          )}
        >
          <span className={cn(value ? "text-white font-bold" : "text-gray-500")}>
            {value || placeholder}
          </span>
          <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform duration-300", isOpen && "rotate-180 text-blue-500")} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
            >
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                <button
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 rounded-xl text-sm transition-all",
                    !value ? "bg-blue-600 text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {placeholder}
                </button>
                {options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 rounded-xl text-sm transition-all",
                      value === opt ? "bg-blue-600 text-white font-bold" : "text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

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
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = () => {
    onSearch(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const hasFilters = selectedAccount || selectedFolder || selectedCategory;

  return (
    <div className="relative z-20">
      <div className="flex items-center gap-3">
        {/* Main Search Area */}
        <div className={cn(
            "flex-1 flex items-center bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-1 transition-all duration-300 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10",
            isExpanded ? "ring-4 ring-blue-500/10" : ""
        )}>
          <div className="pl-4 pr-2">
            <Search className="w-4 h-4 text-gray-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsExpanded(true)}
            placeholder="Search subject, content or sender..."
            className="flex-1 bg-transparent border-none py-3 outline-none text-sm text-white placeholder-gray-600"
          />
          
          <div className="flex items-center gap-1 p-1">
             <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "p-2 rounded-xl transition-all flex items-center gap-2",
                    isExpanded || hasFilters ? "bg-blue-500 text-white" : "hover:bg-gray-800 text-gray-400"
                )}
                title="Filters"
            >
                <Filter className="w-4 h-4" />
                {hasFilters && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
            </button>
            <button
                onClick={handleSearch}
                disabled={loading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
            >
                {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Refresh Toggle */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-3.5 bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 text-gray-400 rounded-2xl hover:text-white hover:border-gray-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5", loading ? "animate-spin" : "")} />
        </button>
      </div>

      {/* Expanded Filters Pane */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-3 p-6 bg-gray-900 border border-gray-800/50 rounded-3xl shadow-2xl overflow-visible grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <CustomDropdown 
              label="Account"
              value={selectedAccount}
              options={accounts}
              placeholder="All Active Accounts"
              onChange={onAccountChange}
            />

            <CustomDropdown 
              label="Folder"
              value={selectedFolder}
              options={folders}
              placeholder="Search All Folders"
              onChange={onFolderChange}
            />

            <CustomDropdown 
              label="Classification"
              value={selectedCategory}
              options={["Interested", "Meeting Booked", "Not Interested", "Spam", "Out of Office"]}
              placeholder="All Categories"
              onChange={onCategoryChange}
            />
            
            <div className="md:col-span-3 pt-2 flex justify-end">
                <button 
                   onClick={() => setIsExpanded(false)}
                   className="text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 px-2 py-1"
                >
                    Close Filters
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
