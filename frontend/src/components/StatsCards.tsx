import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Email, Category } from '../types';

interface Props {
  emails: Email[];
  selectedCategory: string;
  onCategoryClick: (category: string) => void;
}

const CATEGORY_CONFIG: Record<Category, { color: string; icon: any }> = {
  'Interested': {
    color: 'bg-green-900/30 text-green-400 border-green-700',
    icon: CheckCircle
  },
  'Meeting Booked': {
    color: 'bg-blue-900/30 text-blue-400 border-blue-700',
    icon: Clock
  },
  'Not Interested': {
    color: 'bg-gray-800/50 text-gray-400 border-gray-600',
    icon: XCircle
  },
  'Spam': {
    color: 'bg-red-900/30 text-red-400 border-red-700',
    icon: AlertCircle
  },
  'Out of Office': {
    color: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
    icon: Clock
  }
};

const StatsCards: React.FC<Props> = ({ emails, selectedCategory, onCategoryClick }) => {
  const categoryStats = emails.reduce((acc, email) => {
    const cat = (email.category || 'Not Interested') as Category;
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<Category, number>);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {(Object.keys(CATEGORY_CONFIG) as Category[]).map((category) => {
        const count = categoryStats[category] || 0;
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        const isSelected = selectedCategory === category;

        return (
          <div
            key={category}
            onClick={() => onCategoryClick(category === selectedCategory ? '' : category)}
            className={`bg-gray-900 rounded-lg p-4 border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
              isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
              <span className="text-2xl font-bold text-white">{count}</span>
            </div>
            <div className="text-sm font-medium text-gray-400 truncate">
              {category}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;