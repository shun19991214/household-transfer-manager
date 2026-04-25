import React from 'react';
import { Calendar, Plus, Trash2, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFinance } from '../contexts/FinanceContext';
import { Button, Card, Input, PageHeader, IconButton } from './UIComponents';
import CategorySelect from './CategorySelect';
import ZaimImport from './ZaimImport';
import { ExpenseCategory } from '../types';

const MonthlyInput: React.FC = () => {
  const { selectedMonth, setSelectedMonth, getMonthlyData, updateMonthlySalary, addVariableCost, updateVariableCost, deleteVariableCost } = useFinance();

  const currentData = getMonthlyData(selectedMonth);

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMonthlySalary(selectedMonth, Number(e.target.value) || 0);
  };

  const handleAddVariable = () => {
    addVariableCost(selectedMonth, '', 0, 'その他');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<Calendar className="w-6 h-6 text-amber-500" />}
        title="月次データ入力"
        description="月によって変わる収入と変動費を入力します。"
      >
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          aria-label="対象月を選択"
        />
      </PageHeader>

      <Card color="indigo">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">対象月</label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              required
              aria-label="対象月"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              給料 (変動入力)
              <span className="ml-2 text-xs text-slate-400 font-normal">※毎月入力してください</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Wallet className="h-4 w-4 text-slate-400" />
              </div>
              <Input
                type="number"
                className="pl-10"
                value={currentData.salary || ''}
                onChange={handleSalaryChange}
                placeholder="0"
                inputMode="numeric"
                aria-label="給料"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">その他の変動費リスト</h3>
          <Button variant="secondary" onClick={handleAddVariable} size="sm" aria-label="変動費項目を追加">
            <Plus className="w-4 h-4 mr-1" />
            項目を追加
          </Button>
        </div>

        {currentData.variableCosts.length === 0 && (
          <div className="text-center py-12 bg-amber-50/50 rounded-lg border-2 border-dashed border-amber-200 text-slate-500">
            <p>その他の変動費（光熱費やカード払いなど）があれば追加してください。</p>
            <p className="text-sm mt-2">
              <Link to="/input" className="text-teal-600 hover:text-teal-700 underline" aria-label="Zaim連携からインポート">
                Zaim連携からインポート
              </Link>
              することもできます。
            </p>
            <Button variant="primary" onClick={handleAddVariable} className="mt-3" aria-label="変動費項目を追加">
              項目を追加
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {currentData.variableCosts.map((cost) => (
            <Card key={cost.id}>
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-grow">
                  <Input
                    value={cost.name}
                    onChange={(e) => updateVariableCost(selectedMonth, cost.id, e.target.value, cost.amount, cost.category, cost.date)}
                    placeholder="項目名 (例: 電気代)"
                    autoFocus={cost.name === '' && cost.amount === 0}
                    aria-label="項目名"
                  />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={cost.amount || ''}
                      onChange={(e) => updateVariableCost(selectedMonth, cost.id, cost.name, Number(e.target.value) || 0, cost.category, cost.date)}
                      placeholder="0"
                      inputMode="numeric"
                      aria-label="金額"
                    />
                  </div>
                  <Input
                    type="date"
                    value={cost.date || ''}
                    onChange={(e) => updateVariableCost(selectedMonth, cost.id, cost.name, cost.amount, cost.category, e.target.value)}
                    aria-label="計上日"
                  />
                  <CategorySelect
                    value={cost.category}
                    onChange={(cat: ExpenseCategory) => updateVariableCost(selectedMonth, cost.id, cost.name, cost.amount, cat, cost.date)}
                  />
                </div>
                <IconButton variant="danger" label="削除" onClick={() => deleteVariableCost(selectedMonth, cost.id)}>
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Zaim Import */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Zaim連携</h3>
        <ZaimImport />
      </div>
    </div>
  );
};

export default MonthlyInput;
