import React, { useState } from 'react';
import { PieChart, Landmark, Calculator, CheckCircle2, Circle } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { Card, Input } from './UIComponents';

const SummaryDashboard: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const { fixedCosts, getMonthlyData, toggleMonthlyPaidStatus } = useFinance();

  const monthlyData = getMonthlyData(selectedMonth);

  // Calculations
  // Requirement: 支払い金額 = 給料(変動費) - 固定費 - 変動費
  const totalFixed = fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalVariable = monthlyData.variableCosts.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = totalFixed + totalVariable;
  
  // Main calculation requested by user
  const paymentAmount = monthlyData.salary - totalExpenses;

  const handlePaidToggle = () => {
    toggleMonthlyPaidStatus(selectedMonth, !monthlyData.isPaid);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
       <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="w-6 h-6 text-indigo-600" />
            確認画面
          </h2>
          <p className="text-slate-500 mt-1">計算式: 給料 - (固定費 + 変動費)</p>
        </div>
        <div>
          <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border-indigo-200 focus:border-indigo-500"
            />
        </div>
      </header>

      {/* Payment Status & Main Amount */}
      <Card className={`p-6 border-none transition-colors duration-300 ${
          monthlyData.isPaid 
            ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white' 
            : 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white'
        }`}>
        
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 opacity-90">
             <Landmark className="w-5 h-5" />
             <span className="text-sm font-medium">今月の渡す金額</span>
          </div>
          
          <button 
            onClick={handlePaidToggle}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors text-sm font-medium backdrop-blur-sm"
          >
            {monthlyData.isPaid ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                支払完了
              </>
            ) : (
              <>
                <Circle className="w-5 h-5" />
                未払い
              </>
            )}
          </button>
        </div>

        <div className="text-4xl font-bold tracking-tight">
          {formatCurrency(paymentAmount)}
        </div>
        <div className="mt-4 text-sm text-white/80 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          <span>
            給料 {formatCurrency(monthlyData.salary)} - 経費計 {formatCurrency(totalExpenses)}
          </span>
        </div>
      </Card>

      {/* Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 mt-8">内訳詳細</h3>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
           
           {/* Income Section */}
           <div className="bg-indigo-50/50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                給料 (収入)
              </span>
              <span className="font-bold text-indigo-700">+ {formatCurrency(monthlyData.salary)}</span>
           </div>

           {/* Fixed Costs Section */}
           <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                固定費 (マイナス)
              </span>
              <span className="font-bold text-slate-700">- {formatCurrency(totalFixed)}</span>
           </div>
           <div className="divide-y divide-slate-100">
              {fixedCosts.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400 italic">設定なし</div>
              ) : (
                fixedCosts.map(item => (
                  <div key={item.id} className="px-4 py-3 flex justify-between text-sm">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="text-slate-900 font-mono">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              )}
           </div>

           {/* Variable Costs Section */}
           <div className="bg-slate-50 px-4 py-3 border-y border-slate-200 flex justify-between items-center mt-1">
              <span className="font-medium text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                変動費 (マイナス)
              </span>
              <span className="font-bold text-slate-700">- {formatCurrency(totalVariable)}</span>
           </div>
           <div className="divide-y divide-slate-100">
              {monthlyData.variableCosts.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400 italic">登録なし</div>
              ) : (
                monthlyData.variableCosts.map(item => (
                  <div key={item.id} className="px-4 py-3 flex justify-between text-sm">
                    <span className="text-slate-600">{item.name || '（名称未設定）'}</span>
                    <span className="text-slate-900 font-mono">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryDashboard;