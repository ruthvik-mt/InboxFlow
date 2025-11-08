import React from 'react';
import { Mail, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Email, Category, formatEmailAddress } from '../types';

interface Props {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailSelect: (email: Email) => void;
  loading: boolean;
}

const CATEGORY_CONFIG: Record<Category, { color: string; icon: any }> = {
  'Interested': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  'Meeting Booked': { color: 'bg-blue-100 text-blue-800', icon: Clock },
  'Not Interested': { color: 'bg-gray-100 text-gray-800', icon: XCircle },
  'Spam': { color: 'bg-red-100 text-red-800', icon: AlertCircle },
  'Out of Office': { color: 'bg-yellow-100 text-yellow-800', icon: Clock }
};

const EmailList: React.FC<Props> = ({ emails, selectedEmail, onEmailSelect, loading }) => {
  if (loading && emails.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p>Loading emails...</p>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <Mail className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No emails found</p>
          <p className="text-sm">Try adjusting your filters or search query</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Emails ({emails.length})
        </h2>
      </div>

      {/* Email List */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 450px)' }}>
        {emails.map((email) => {
          const category = (email.category || 'Not Interested') as Category;
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          const isSelected = selectedEmail?._id === email._id;

          return (
            <div
              key={email._id}
              onClick={() => onEmailSelect(email)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <div className="font-medium text-gray-900 truncate mb-1">
                    {email.subject || '(No Subject)'}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {formatEmailAddress(email.from)}
                  </div>
                </div>
                <Icon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${config.color}`}>
                  {category}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(email.date).toLocaleDateString()}
                </span>
                {email.account && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded truncate max-w-[120px]">
                    {email.account}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EmailList;