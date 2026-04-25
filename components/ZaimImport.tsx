import React, { useState } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { fetchZaimMoney, fetchZaimCategories, isZaimConfigured } from '../utils/zaimApi';
import { mapZaimCategory } from '../utils/zaimMapping';
import { formatCurrency } from '../utils/format';
import { Card, Button, Input } from './UIComponents';
import { CategoryBadge } from './CategorySelect';
import { ExpenseCategory } from '../types';

interface ImportItem {
  name: string;
  amount: number;
  category: ExpenseCategory;
  selected: boolean;
}

const ZaimImport: React.FC = () => {
  const { addVariableCost, getMonthlyData } = useFinance();
  const [targetMonth, setTargetMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState<ImportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imported, setImported] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const configured = isZaimConfigured();

  const handleFetch = async () => {
    if (loading) return; // Prevent double-fetch on rapid clicks
    setLoading(true);
    setError('');
    setImported(false);
    setDuplicateWarning('');
    try {
      // Fetch categories first for name resolution
      const cats = await fetchZaimCategories();
      const catMap = new Map(cats.map(c => [c.id, c.name]));

      // Fetch transactions for the target month
      const [year, month] = targetMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const transactions = await fetchZaimMoney(startDate, endDate);

      // Aggregate by category
      const aggregated = new Map<string, { amount: number; category: ExpenseCategory }>();
      for (const tx of transactions) {
        if (tx.mode !== 'payment') continue;
        const catName = catMap.get(tx.category_id) || 'その他';
        const appCategory = mapZaimCategory(catName);
        const key = catName;
        const existing = aggregated.get(key);
        if (existing) {
          existing.amount += tx.amount;
        } else {
          aggregated.set(key, { amount: tx.amount, category: appCategory });
        }
      }

      // Check for duplicates
      const currentData = getMonthlyData(targetMonth);
      const existingZaimNames = new Set(
        currentData.variableCosts
          .filter(c => c.name.endsWith('(Zaim)'))
          .map(c => c.name)
      );

      const importItems: ImportItem[] = Array.from(aggregated.entries()).map(([name, { amount, category }]) => {
        const itemName = `${name}(Zaim)`;
        return {
          name: itemName,
          amount,
          category,
          selected: !existingZaimNames.has(itemName), // Deselect duplicates
        };
      });

      if (existingZaimNames.size > 0) {
        const dupeCount = importItems.filter(i => existingZaimNames.has(i.name)).length;
        if (dupeCount > 0) {
          setDuplicateWarning(`${dupeCount}件の項目は既にインポート済みのため選択解除されています。`);
        }
      }

      setItems(importItems);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '取得に失敗しました';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    const selected = items.filter(i => i.selected);
    for (const item of selected) {
      addVariableCost(targetMonth, item.name, item.amount, item.category);
    }
    setImported(true);
    setItems([]);
  };

  const toggleItem = (name: string) => {
    setItems(prev => prev.map((item) => item.name === name ? { ...item, selected: !item.selected } : item));
  };

  const toggleAll = () => {
    const allSelected = items.every(i => i.selected);
    setItems(prev => prev.map(item => ({ ...item, selected: !allSelected })));
  };

  if (!configured) {
    return (
      <Card color="amber">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">Zaim連携が未設定です</h3>
            <p className="text-xs text-amber-700 mt-1">
              1. <code className="bg-amber-100 px-1 rounded">node scripts/zaim-auth.mjs</code> を実行してアクセストークンを取得<br />
              2. <code className="bg-amber-100 px-1 rounded">.env</code> に VITE_ZAIM_CONSUMER_KEY と VITE_ZAIM_ACCESS_TOKEN を設定<br />
              3. devサーバーを再起動
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">取込対象月</label>
          <Input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            aria-label="取込対象月"
          />
        </div>
        <Button onClick={handleFetch} variant="info" disabled={loading} aria-label="Zaimからデータを取得">
          {loading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
          Zaimから取得
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {duplicateWarning && (
        <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {duplicateWarning}
        </div>
      )}

      {imported && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {targetMonth} の変動費にインポートしました!
        </div>
      )}

      {items.length > 0 && (
        <Card color="teal">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-slate-800">
              取得結果（{items.length}件）
            </h4>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={toggleAll} aria-label="全選択/全解除">
                {items.every(i => i.selected) ? '全解除' : '全選択'}
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={handleImport}
                disabled={!items.some(i => i.selected)}
                aria-label="選択した項目をインポート"
              >
                <ArrowRight className="w-4 h-4 mr-1" />
                インポート ({items.filter(i => i.selected).length}件)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  item.selected ? 'bg-teal-50' : 'bg-slate-50 opacity-60'
                }`}
                onClick={() => toggleItem(item.name)}
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleItem(item.name)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  aria-label={`${item.name} を選択`}
                />
                <span className="text-sm text-slate-700 flex-grow">{item.name}</span>
                <CategoryBadge category={item.category} />
                <span className="text-sm font-bold text-slate-800 font-mono">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-sm">
            <span className="text-slate-500">選択合計</span>
            <span className="font-bold text-slate-800">
              {formatCurrency(items.filter(i => i.selected).reduce((s, i) => s + i.amount, 0))}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ZaimImport;
