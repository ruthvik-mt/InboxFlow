import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Category } from '../types';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

interface Props {
  stats?: Record<string, number>;
  selectedCategory: string;
  onCategoryClick: (category: string) => void;
}

const CATEGORY_CONFIG: Record<Category, { color: string; icon: any; glow: string }> = {
  'Interested': {
    color: 'text-green-400',
    glow: 'from-green-500/20 to-transparent',
    icon: TrendingUp
  },
  'Meeting Booked': {
    color: 'text-blue-400',
    glow: 'from-blue-500/20 to-transparent',
    icon: Clock
  },
  'Not Interested': {
    color: 'text-gray-400',
    glow: 'from-gray-500/20 to-transparent',
    icon: XCircle
  },
  'Spam': {
    color: 'text-red-400',
    glow: 'from-red-500/20 to-transparent',
    icon: AlertCircle
  },
  'Out of Office': {
    color: 'text-yellow-400',
    glow: 'from-yellow-500/20 to-transparent',
    icon: CheckCircle
  }
};

const StatsCards: React.FC<Props> = ({ stats = {}, selectedCategory, onCategoryClick }) => {

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
    >
      {(Object.keys(CATEGORY_CONFIG) as Category[]).map((category) => {
        const count = stats[category] || 0;
        const config = CATEGORY_CONFIG[category];
        const Icon = config.icon;
        const isSelected = selectedCategory === category;

        return (
          <motion.div
            key={category}
            variants={item}
            whileHover={{ scale: 1.02, translateY: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onCategoryClick(category === selectedCategory ? '' : category)}
            className={cn(
              "relative overflow-hidden rounded-2xl p-5 cursor-pointer border transition-all duration-300",
              "bg-gray-900/40 backdrop-blur-md border-gray-800/50",
              isSelected ? "border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20" : "hover:border-gray-700"
            )}
          >
            {/* Background Glow */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10", config.glow)} />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-2 rounded-xl bg-gray-800/50", config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <motion.span 
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  key={count}
                  className="text-2xl font-black text-white"
                >
                  {count}
                </motion.span>
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                {category}
              </div>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <motion.div 
                layoutId="selection-stats"
                className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"
              />
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default StatsCards;
