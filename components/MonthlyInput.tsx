import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Wallet } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { Button, Card, Input } from './UIComponents';

const MonthlyInput: React.FC = () => {
  // Default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { getMonthlyData, updateMonthlySalary, addVariableCost, updateVariableCost, deleteVariableCost } = useFinance();

  const currentData = getMonthlyData(selectedMonth);

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateMonthlySalary(selectedMonth, parseInt(e.target.value, 10) || 0);
  };

  const handleAddVariable = () => {
    addVariableCost(selectedMonth, '', 0);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      <header>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-600" />
          月次データ入力
        </h2>
        <p className="text-slate-500 mt-1">月によって変わる収入と変動費を入力します。</p>
      </header>

      {/* 給料入力エリア（変動するが必須項目として別枠表示） */}
      <Card className="p-6 border-l-4 border-l-indigo-500">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">対象月</label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              required
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
                />
             </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">その他の変動費リスト</h3>
          <Button variant="secondary" onClick={handleAddVariable} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            項目を追加
          </Button>
        </div>

        {currentData.variableCosts.length === 0 && (
          <div className="text-center py-12 bg-slate-100 rounded-lg border-2 border-dashed border-slate-200 text-slate-500">
            <p>その他の変動費（光熱費やカード払いなど）があれば追加してください。</p>
            <Button variant="primary" onClick={handleAddVariable} className="mt-3">
              項目を追加
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {currentData.variableCosts.map((cost) => (
            <Card key={cost.id} className="p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-grow">
                  <Input
                    value={cost.name}
                    onChange={(e) => updateVariableCost(selectedMonth, cost.id, e.target.value, cost.amount)}
                    placeholder="項目名 (例: 電気代)"
                    autoFocus={cost.name === '' && cost.amount === 0} 
                  />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
                    <Input
                      type="number"
                      className="pl-7"
                      value={cost.amount || ''}
                      onChange={(e) => updateVariableCost(selectedMonth, cost.id, cost.name, parseInt(e.target.value, 10) || 0)}
                      placeholder="0"
                    />
                  </div>
               </div>
               <Button variant="danger" onClick={() => deleteVariableCost(selectedMonth, cost.id)} className="p-2 flex-shrink-0">
                 <Trash2 className="w-4 h-4" />
               </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MonthlyInput;