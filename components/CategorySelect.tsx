import React from 'react';
import { EXPENSE_CATEGORIES, ExpenseCategory, CATEGORY_COLORS } from '../types';

interface CategorySelectProps {
  value?: ExpenseCategory;
  onChange: (category: ExpenseCategory) => void;
  className?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, className = '' }) => {
  return (
    <select
      value={value || 'その他'}
      onChange={(e) => onChange(e.target.value as ExpenseCategory)}
      className={`block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 bg-white text-slate-900 min-h-[44px] ${className}`}
      style={{ colorScheme: 'light' }}
      aria-label="カテゴリ選択"
    >
      {EXPENSE_CATEGORIES.map((cat) => (
        <option key={cat} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  );
};

// Colors that need dark text for contrast
const LIGHT_COLORS = new Set<ExpenseCategory>(['食費', 'その他', '娯楽', '立替金']);

export const CategoryBadge: React.FC<{ category?: ExpenseCategory }> = ({ category }) => {
  const cat = category || 'その他';
  const color = CATEGORY_COLORS[cat];
  const textColor = LIGHT_COLORS.has(cat) ? 'text-slate-800' : 'text-white';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${textColor}`}
      style={{ backgroundColor: color }}
    >
      {cat}
    </span>
  );
};

export default CategorySelect;
