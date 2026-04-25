import React, { useState } from 'react';
import { PieChart, Landmark, Calculator, CheckCircle2, Circle, GraduationCap, PiggyBank, AlertTriangle, Share2 } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { calculateRemainingBalance } from '../utils/scholarship';
import { Card, Input, PageHeader, ConfirmDialog } from './UIComponents';
import { CategoryBadge } from './CategorySelect';
import { Link } from 'react-router-dom';
import { SCHOLARSHIP_CATEGORIES } from '../types';
import TransferCalendarSection from './TransferCalendarSection';
import ShareCard from './ShareCard';

const SummaryDashboard: React.FC = () => {
  const { selectedMonth, setSelectedMonth, fixedCosts, getMonthlyData, toggleMonthlyPaidStatus, scholarshipLoans, savingsGoals } = useFinance();
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const monthlyData = getMonthlyData(selectedMonth);

  const isScholarshipCategory = (cat?: string) => SCHOLARSHIP_CATEGORIES.includes(cat as any);

  // 奨学金の月額返済を自動計算（残高がある奨学金のみ）
  const activeLoans = scholarshipLoans.filter(
    loan => calculateRemainingBalance(loan, selectedMonth) > 0
  );
  const totalLoanPayment = activeLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  // 固定費・変動費から奨学金関連カテゴリを分離
  const fixedCostsWithoutScholarship = fixedCosts.filter(c => !isScholarshipCategory(c.category));
  const fixedCostsScholarship = fixedCosts.filter(c => isScholarshipCategory(c.category));
  const variableCostsScholarship = monthlyData.variableCosts.filter(c => isScholarshipCategory(c.category));
  const variableCostsOther = monthlyData.variableCosts.filter(c => !isScholarshipCategory(c.category));

  // 奨学金セクション合計 = トラッカー返済額 + 奨学金関連の固定費/変動費（積立など）
  const totalScholarshipReserve = fixedCostsScholarship.reduce((s, c) => s + c.amount, 0)
    + variableCostsScholarship.reduce((s, c) => s + c.amount, 0);
  const totalScholarshipSection = totalLoanPayment + totalScholarshipReserve;

  const totalFixed = fixedCostsWithoutScholarship.reduce((sum, item) => sum + item.amount, 0);
  const totalVariable = variableCostsOther.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = totalFixed + totalScholarshipSection + totalVariable;
  const paymentAmount = monthlyData.salary - totalExpenses;

  const totalLoanRemaining = scholarshipLoans.reduce(
    (sum, loan) => sum + calculateRemainingBalance(loan, selectedMonth), 0
  );

  // 奨学金返済積立の累計
  const { monthlyData: allMonthlyData } = useFinance();
  const reserveTotal = allMonthlyData.reduce((sum, md) =>
    sum + md.variableCosts.filter(c => c.category === '奨学金返済積立').reduce((s, c) => s + c.amount, 0), 0
  ) + fixedCosts.filter(c => c.category === '奨学金返済積立').reduce((s, c) => s + c.amount, 0) * (allMonthlyData.length || 1);
  const effectiveLoanRemaining = Math.max(0, totalLoanRemaining - reserveTotal);

  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);

  const handlePaidToggle = () => {
    setConfirmToggle(true);
  };

  const confirmPaidToggle = () => {
    toggleMonthlyPaidStatus(selectedMonth, !monthlyData.isPaid);
    setConfirmToggle(false);
  };

  // First-run empty state
  if (fixedCosts.length === 0 && scholarshipLoans.length === 0 && monthlyData.salary === 0) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
        <PageHeader
          icon={<PieChart className="w-6 h-6 text-indigo-600" />}
          title="確認画面"
          description="計算式: 給料 - (固定費 + 奨学金返済 + 変動費)"
        />
        <Card>
          <div className="text-center py-12 text-slate-500">
            <PieChart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-lg font-medium text-slate-700 mb-2">はじめましょう!</p>
            <p className="text-sm mb-4">まず固定費と月次データを入力してください。</p>
            <div className="flex justify-center gap-3">
              <Link to="/settings" className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-medium" aria-label="固定費設定へ">
                固定費を設定
              </Link>
              <Link to="/input" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium" aria-label="月次入力へ">
                月次データ入力
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<PieChart className="w-6 h-6 text-indigo-600" />}
        title="確認画面"
        description="計算式: 給料 - (固定費 + 奨学金返済 + 変動費)"
      >
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border-indigo-200 focus:border-indigo-500"
          aria-label="対象月を選択"
        />
      </PageHeader>

      {/* Payment Status & Main Amount */}
      {paymentAmount < 0 ? (
        <Card className="border-none bg-gradient-to-br from-red-500 to-red-700 text-white">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium text-white">支出が収入を超えています</span>
            </div>
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors text-sm font-medium backdrop-blur-sm"
              aria-label="画像でシェア"
            >
              <Share2 className="w-4 h-4" />シェア
            </button>
          </div>
          <div className="text-4xl font-bold tracking-tight">
            {formatCurrency(paymentAmount)}
          </div>
          <div className="mt-4 text-sm text-white flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span>給料 {formatCurrency(monthlyData.salary)} - 経費計 {formatCurrency(totalExpenses)}</span>
          </div>
        </Card>
      ) : (
        <Card className={`border-none transition-all duration-300 ${
          monthlyData.isPaid
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
            : 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white'
        }`}>
          <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5" />
              <span className="text-sm font-medium text-white">今月の渡す金額</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors text-sm font-medium backdrop-blur-sm"
                aria-label="画像でシェア"
              >
                <Share2 className="w-4 h-4" />シェア
              </button>
              <button
                onClick={handlePaidToggle}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors text-sm font-medium backdrop-blur-sm"
                aria-label={monthlyData.isPaid ? '未払いに戻す' : '支払完了にする'}
              >
                {monthlyData.isPaid ? (
                  <><CheckCircle2 className="w-5 h-5" />支払完了</>
                ) : (
                  <><Circle className="w-5 h-5" />未払い</>
                )}
              </button>
            </div>
          </div>
          <div className="text-4xl font-bold tracking-tight">
            {formatCurrency(paymentAmount)}
          </div>
          <div className="mt-4 text-sm text-white flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span>給料 {formatCurrency(monthlyData.salary)} - 経費計 {formatCurrency(totalExpenses)}</span>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirmToggle}
        title="支払いステータスの変更"
        message={monthlyData.isPaid ? 'この月を「未払い」に戻しますか？' : 'この月を「支払完了」にしますか？'}
        confirmLabel={monthlyData.isPaid ? '未払いに戻す' : '支払完了にする'}
        confirmVariant={monthlyData.isPaid ? 'danger' : 'success'}
        onConfirm={confirmPaidToggle}
        onCancel={() => setConfirmToggle(false)}
      />

      {/* Quick Stats */}
      {(scholarshipLoans.length > 0 || savingsGoals.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {scholarshipLoans.length > 0 && (
            <Link to="/assets" aria-label="資産管理ページへ">
              <Card color="teal" className="hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="w-4 h-4 text-teal-500" />
                  <span className="text-xs text-slate-500">{reserveTotal > 0 ? '実質残高' : '奨学金残高'}</span>
                </div>
                <p className="text-xl font-bold text-teal-600">{formatCurrency(reserveTotal > 0 ? effectiveLoanRemaining : totalLoanRemaining)}</p>
                {reserveTotal > 0 && (
                  <p className="text-xs text-slate-400 mt-1">積立 {formatCurrency(reserveTotal)} 控除後</p>
                )}
              </Card>
            </Link>
          )}
          {savingsGoals.length > 0 && (
            <Link to="/assets" aria-label="資産管理ページへ">
              <Card color="emerald" className="hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-500">貯金総額</span>
                </div>
                <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalSaved)}</p>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* 二重計上警告: 奨学金カテゴリの固定費がトラッカーの返済と重複する場合 */}
      {fixedCostsScholarship.some(c => c.category === '奨学金') && activeLoans.length > 0 && (
        <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            固定費に「奨学金」カテゴリの項目がありますが、奨学金トラッカーの返済額が自動で含まれるため、
            「奨学金」カテゴリの固定費は奨学金セクションにまとめて表示しています。
            返済額と別に積立をする場合は「奨学金返済積立」カテゴリをご利用ください。
          </span>
        </div>
      )}

      {/* Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 mt-4">内訳詳細</h3>

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
          <div className="bg-violet-50/50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <span className="font-medium text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400"></span>
              固定費 (マイナス)
            </span>
            <span className="font-bold text-slate-700">- {formatCurrency(totalFixed)}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {fixedCostsWithoutScholarship.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 italic">設定なし</div>
            ) : (
              fixedCostsWithoutScholarship.map(item => (
                <div key={item.id} className="px-4 py-3 flex justify-between items-center text-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    {item.name}
                    {item.category && <CategoryBadge category={item.category} />}
                  </span>
                  <span className="text-slate-900 font-mono">{formatCurrency(item.amount)}</span>
                </div>
              ))
            )}
          </div>

          {/* Scholarship Section: tracker payments + reserve/savings */}
          {(activeLoans.length > 0 || totalScholarshipReserve > 0) && (
            <>
              <div className="bg-teal-50/50 px-4 py-3 border-y border-slate-200 flex justify-between items-center">
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  奨学金関連 (マイナス)
                </span>
                <span className="font-bold text-slate-700">- {formatCurrency(totalScholarshipSection)}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {activeLoans.map(loan => (
                  <div key={loan.id} className="px-4 py-3 flex justify-between items-center text-sm">
                    <span className="text-slate-600 flex items-center gap-2">
                      {loan.label}
                      <CategoryBadge category="奨学金" />
                      <span className="text-xs text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded">自動</span>
                    </span>
                    <span className="text-slate-900 font-mono">{formatCurrency(loan.monthlyPayment)}</span>
                  </div>
                ))}
                {[...fixedCostsScholarship, ...variableCostsScholarship].map(item => (
                  <div key={item.id} className="px-4 py-3 flex justify-between items-center text-sm">
                    <span className="text-slate-600 flex items-center gap-2">
                      {item.name}
                      <CategoryBadge category={item.category} />
                    </span>
                    <span className="text-slate-900 font-mono">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Variable Costs Section */}
          <div className="bg-amber-50/50 px-4 py-3 border-y border-slate-200 flex justify-between items-center mt-1">
            <span className="font-medium text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              変動費 (マイナス)
            </span>
            <span className="font-bold text-slate-700">- {formatCurrency(totalVariable)}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {variableCostsOther.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400 italic">登録なし</div>
            ) : (
              variableCostsOther.map(item => (
                <div key={item.id} className="px-4 py-3 flex justify-between items-center text-sm">
                  <span className="text-slate-600 flex items-center gap-2">
                    {item.name || '（名称未設定）'}
                    {item.category && <CategoryBadge category={item.category} />}
                  </span>
                  <span className="text-slate-900 font-mono">{formatCurrency(item.amount)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transfer Calendar Section */}
      <TransferCalendarSection />

      {/* Share Modal */}
      <ShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        data={{
          month: selectedMonth,
          salary: monthlyData.salary,
          paymentAmount,
          totalExpenses,
          totalFixed,
          totalScholarshipSection,
          totalVariable,
          isPaid: monthlyData.isPaid,
          fixedItems: fixedCostsWithoutScholarship.map(c => ({
            id: c.id, name: c.name, amount: c.amount, category: c.category,
          })),
          scholarshipItems: [
            ...activeLoans.map(l => ({
              id: `loan-${l.id}`, name: l.label, amount: l.monthlyPayment,
              category: '奨学金' as const, auto: true,
            })),
            ...fixedCostsScholarship.map(c => ({
              id: c.id, name: c.name, amount: c.amount, category: c.category,
            })),
            ...variableCostsScholarship.map(c => ({
              id: c.id, name: c.name, amount: c.amount, category: c.category,
            })),
          ],
          variableItems: variableCostsOther.map(c => ({
            id: c.id, name: c.name, amount: c.amount, category: c.category,
          })),
        }}
      />
    </div>
  );
};

export default SummaryDashboard;
