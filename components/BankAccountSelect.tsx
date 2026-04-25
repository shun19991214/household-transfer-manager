import React from 'react';
import { useFinance } from '../contexts/FinanceContext';

interface BankAccountSelectProps {
  value?: string; // bankAccountId
  onChange: (bankAccountId: string) => void;
  className?: string;
}

const BankAccountSelect: React.FC<BankAccountSelectProps> = ({ value, onChange, className = '' }) => {
  const { bankAccounts } = useFinance();

  if (bankAccounts.length === 0) return null;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 bg-white text-slate-900 min-h-[44px] ${className}`}
      style={{ colorScheme: 'light' }}
      aria-label="振り分け先口座"
    >
      <option value="">口座未指定</option>
      {bankAccounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.bankName}{a.branchName ? ` ${a.branchName}` : ''}{a.accountNumber ? ` *${a.accountNumber}` : ''}
        </option>
      ))}
    </select>
  );
};

export const BankAccountBadge: React.FC<{ bankAccountId?: string }> = ({ bankAccountId }) => {
  const { bankAccounts } = useFinance();
  if (!bankAccountId) return null;
  const account = bankAccounts.find(a => a.id === bankAccountId);
  if (!account) return null;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
      style={account.color ? { backgroundColor: `${account.color}20`, color: account.color } : undefined}
    >
      {account.bankName}
    </span>
  );
};

export default BankAccountSelect;
