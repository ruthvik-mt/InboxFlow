import React from 'react';
import { Mail, Calendar, User, Folder, Tag } from 'lucide-react';
import { Email, Category, formatEmailAddress } from '../types';

interface Props {
  email: Email | null;
}

const CATEGORY_CONFIG: Record<Category, string> = {
  'Interested': 'bg-green-100 text-green-800',
  'Meeting Booked': 'bg-blue-100 text-blue-800',
  'Not Interested': 'bg-gray-100 text-gray-800',
  'Spam': 'bg-red-100 text-red-800',
  'Out of Office': 'bg-yellow-100 text-yellow-800'
};

const EmailDetail: React.FC<Props> = ({ email }) => {
  if (!email) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-full">
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <Mail className="w-20 h-20 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Select an email to view details</p>
            <p className="text-sm mt-2">Click on any email from the list</p>
          </div>
        </div>
      </div>
    );
  }

  const category = (email.category || 'Not Interested') as Category;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {email.subject || '(No Subject)'}
        </h2>

        <div className="space-y-3 text-sm">
          {/* From */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-600">From:</span>
              <div className="text-gray-900 mt-0.5">{formatEmailAddress(email.from)}</div>
            </div>
          </div>

          {/* To */}
          {email.to && (
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-600">To:</span>
                <div className="text-gray-900 mt-0.5">{formatEmailAddress(email.to)}</div>
              </div>
            </div>
          )}

          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-600">Date:</span>
              <div className="text-gray-900 mt-0.5">
                {new Date(email.date).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'short'
                })}
              </div>
            </div>
          </div>

          {/* Account */}
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-600">Account:</span>
              <div className="text-gray-900 mt-0.5">
                {email.accountEmail || email.account}
              </div>
            </div>
          </div>

          {/* Folder */}
          <div className="flex items-start gap-3">
            <Folder className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-600">Folder:</span>
              <div className="text-gray-900 mt-0.5">{email.folder || 'INBOX'}</div>
            </div>
          </div>

          {/* Category */}
          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-gray-600">Category:</span>
              <div className="mt-1">
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  CATEGORY_CONFIG[category]
                }`}>
                  {category}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 550px)' }}>
        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
            {email.body || '(No content)'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default EmailDetail;

