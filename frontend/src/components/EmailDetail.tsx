import React from 'react';
import { Mail, Calendar, User, Folder, Tag, ExternalLink } from 'lucide-react';
import { Email, Category, formatEmailAddress } from '../types';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface Props {
  email: Email | null;
}

const CATEGORY_CONFIG: Record<Category, string> = {
  'Interested': 'text-green-400 bg-green-500/10 border-green-500/20',
  'Meeting Booked': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Not Interested': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
  'Spam': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Out of Office': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
};

function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

const EmailDetail: React.FC<Props> = ({ email }) => {
  if (!email) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-gray-800/50 h-full flex flex-col items-center justify-center p-12 text-center"
      >
        <div className="bg-gray-800/40 p-6 rounded-3xl mb-6 relative">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3] 
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-xl"
          />
          <Mail className="w-16 h-16 text-gray-700 relative z-10" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Message Center</h3>
        <p className="text-gray-500 text-sm max-w-xs">Select an email from the list to view its contents and AI analysis.</p>
      </motion.div>
    );
  }

  const category = (email.category || 'Not Interested') as Category;
  const body = email.body || '(No content)';
  const bodyIsHTML = isHTML(body);

  return (
    <motion.div 
      key={email._id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-900/40 backdrop-blur-md rounded-2xl border border-gray-800/50 flex flex-col h-full overflow-hidden shadow-2xl"
    >
      {/* Header Info */}
      <div className="p-8 border-b border-gray-800/50 bg-gray-900/20">
        <div className="flex items-start justify-between gap-6 mb-8">
            <h2 className="text-2xl font-black text-white leading-tight flex-1">
            {email.subject || '(No Subject)'}
            </h2>
            <div className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border",
                CATEGORY_CONFIG[category]
            )}>
                {category}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800/50 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black text-gray-600 tracking-wider">From</span>
              <div className="text-sm font-bold text-gray-200 truncate">{formatEmailAddress(email.from)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800/50 rounded-lg">
                <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black text-gray-600 tracking-wider">Received</span>
              <div className="text-sm font-bold text-gray-200 truncate">
                {new Date(email.date).toLocaleString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800/50 rounded-lg">
                <Tag className="w-4 h-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black text-gray-600 tracking-wider">Account</span>
              <div className="text-sm font-bold text-gray-200 truncate">{email.accountEmail || email.account}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-800/50 rounded-lg">
                <Folder className="w-4 h-4 text-gray-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black text-gray-600 tracking-wider">Folder</span>
              <div className="text-sm font-bold text-gray-200 truncate lowercase">{email.folder || 'inbox'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-gray-900/10">
        <div className="max-w-none">
          {bodyIsHTML ? (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl overflow-hidden bg-white/5 border border-white/10"
            >
                <iframe
                srcDoc={`<style>body{color:#d1d5db;font-family:sans-serif;line-height:1.6;}</style>${body}`}
                className="w-full border-0"
                style={{ minHeight: '500px' }}
                onLoad={(e) => {
                    const iframe = e.target as HTMLIFrameElement;
                    if (iframe.contentDocument) {
                    iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
                    }
                }}
                sandbox="allow-same-origin"
                title="Email Content"
                />
            </motion.div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed bg-gray-800/30 p-6 rounded-xl border border-gray-800/50">
              {body}
            </pre>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-gray-800/50 bg-gray-900/30 flex justify-end">
        <button 
          onClick={() => {
            if (email.messageId) {
              const cleanId = email.messageId.replace(/[<>]/g, '');
              window.open(`https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(cleanId)}`, '_blank');
            } else {
              const gmailSearch = encodeURIComponent(`subject:"${email.subject}"`);
              window.open(`https://mail.google.com/mail/u/0/#search/${gmailSearch}`, '_blank');
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
        >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Full View
        </button>
      </div>
    </motion.div>
  );
};

export default EmailDetail;

