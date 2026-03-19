import React from 'react';
import { Mail, Clock, XCircle, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { Email, Category, formatEmailAddress } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';

interface Props {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailSelect: (email: Email) => void;
  loading: boolean;
}

const CATEGORY_CONFIG: Record<Category, { color: string; dot: string; icon: any }> = {
  'Interested': { color: 'text-green-400 bg-green-500/10', dot: 'bg-green-500', icon: TrendingUp },
  'Meeting Booked': { color: 'text-blue-400 bg-blue-500/10', dot: 'bg-blue-500', icon: Clock },
  'Not Interested': { color: 'text-gray-400 bg-gray-500/10', dot: 'bg-gray-500', icon: XCircle },
  'Spam': { color: 'text-red-400 bg-red-500/10', dot: 'bg-red-500', icon: AlertCircle },
  'Out of Office': { color: 'text-yellow-400 bg-yellow-500/10', dot: 'bg-yellow-500', icon: Calendar }
};

const EmailList: React.FC<Props> = ({ emails, selectedEmail, onEmailSelect, loading }) => {
  if (loading && emails.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800 p-12 flex flex-col items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mb-4"
        />
        <p className="text-gray-400 font-medium">Scanning your inbox...</p>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800 p-12 flex flex-col items-center justify-center text-center">
        <div className="bg-gray-800/50 p-4 rounded-2xl mb-4">
          <Mail className="w-12 h-12 text-gray-600" />
        </div>
        <p className="text-xl font-bold text-white mb-2">Inbox Empty</p>
        <p className="text-gray-500 text-sm max-w-xs">Try adjusting your filters or wait for new synchronized emails.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-gray-800/50 overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800/50 bg-gray-900/20 flex items-center justify-between">
        <h2 className="font-bold text-white flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Mail className="w-4 h-4 text-blue-400" />
          </div>
          Recent Activity
          <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full ml-1">
            {emails.length}
          </span>
        </h2>
      </div>

      {/* Email List */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        <AnimatePresence initial={false}>
          {emails.map((email, idx) => {
            const category = (email.category || 'Not Interested') as Category;
            const config = CATEGORY_CONFIG[category];
            const isSelected = selectedEmail?._id === email._id;

            return (
              <motion.div
                key={email._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                onClick={() => onEmailSelect(email)}
                className={cn(
                  "p-5 cursor-pointer relative transition-all duration-200 border-b border-gray-800/30",
                  isSelected 
                    ? "bg-blue-500/10" 
                    : "hover:bg-gray-800/40"
                )}
              >
                {/* Active Indicator */}
                {isSelected && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  />
                )}

                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "font-bold truncate mb-1 transition-colors",
                        isSelected ? "text-blue-400" : "text-gray-100"
                      )}>
                        {email.subject || '(No Subject)'}
                      </div>
                      <div className="text-xs text-gray-500 font-medium truncate flex items-center gap-1">
                        <span className="text-gray-400">{formatEmailAddress(email.from)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        config.color
                       )}>
                        {category}
                      </span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-600 flex items-center gap-1 uppercase tracking-widest">
                      {new Date(email.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EmailList;
