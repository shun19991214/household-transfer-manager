import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Trash2, Edit3, X, Check, TrendingDown } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { calculateRemainingBalance, calculatePayoffDate, calculateProgress, calculateTotalInterest } from '../utils/scholarship';
import { Card, Button, Input, ProgressBar, PageHeader, IconButton, useToast } from './UIComponents';
import { ScholarshipLoan } from '../types';

const currentMonth = () => new Date().toISOString().slice(0, 7);

const LoanCard: React.FC<{
  loan: ScholarshipLoan;
  onUpdate: (id: string, updates: Partial<ScholarshipLoan>) => void;
  onDelete: (id: string) => void;
}> = ({ loan, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(loan);

  // Sync form state when loan prop changes externally (e.g., cloud sync)
  useEffect(() => {
    if (!editing) setForm(loan);
  }, [loan, editing]);

  const handleStartEditing = () => {
    setForm(loan); // Reset form to current prop values to avoid stale state
    setEditing(true);
  };

  const remaining = calculateRemainingBalance(loan, currentMonth());
  const payoffDate = calculatePayoffDate(loan);
  const progress = calculateProgress(loan, currentMonth());
  const totalInterest = calculateTotalInterest(loan);
  const isType1 = loan.type === 'type1';

  const handleSave = () => {
    onUpdate(loan.id, form);
    setEditing(false);
  };

  if (editing) {
    return (
      <Card color="teal">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-slate-800">編集中</h4>
            <div className="flex gap-2">
              <Button variant="success" size="sm" onClick={handleSave} aria-label="保存"><Check className="w-4 h-4" /></Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)} aria-label="キャンセル"><X className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">名前</label>
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} aria-label="奨学金の名前" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">種類</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'type1' | 'type2', interestRate: e.target.value === 'type1' ? 0 : form.interestRate })}
                className="block w-full rounded-lg border-slate-300 shadow-sm py-2.5 px-3 bg-white text-slate-900 text-sm min-h-[44px]"
                style={{ colorScheme: 'light' }}
                aria-label="奨学金の種類"
              >
                <option value="type1">第一種（無利子）</option>
                <option value="type2">第二種（有利子）</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">借入総額</label>
              <Input type="number" value={form.totalBorrowed || ''} onChange={(e) => setForm({ ...form, totalBorrowed: Number(e.target.value) || 0 })} inputMode="numeric" aria-label="借入総額" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">月額返済</label>
              <Input type="number" value={form.monthlyPayment || ''} onChange={(e) => setForm({ ...form, monthlyPayment: Number(e.target.value) || 0 })} inputMode="numeric" aria-label="月額返済" />
            </div>
            {form.type === 'type2' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">年利 (%)</label>
                <Input type="number" step="any" value={form.interestRate || ''} onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) || 0 })} aria-label="年利" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">返済開始月</label>
              <Input type="month" value={form.repaymentStartMonth} onChange={(e) => setForm({ ...form, repaymentStartMonth: e.target.value })} aria-label="返済開始月" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card color="teal">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-lg font-bold text-slate-800">{loan.label}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isType1 ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
              {isType1 ? '第一種（無利子）' : '第二種（有利子）'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">返済開始: {loan.repaymentStartMonth}</p>
        </div>
        <div className="flex gap-1">
          <IconButton label="編集" onClick={handleStartEditing}>
            <Edit3 className="w-4 h-4" />
          </IconButton>
          <IconButton variant="danger" label="削除" onClick={() => onDelete(loan.id)}>
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500">借入総額</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(loan.totalBorrowed)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">残高</p>
          <p className="text-lg font-bold text-teal-600">{formatCurrency(remaining)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">月額返済</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(loan.monthlyPayment)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">完済予定</p>
          <p className="text-lg font-bold text-slate-800">{payoffDate}</p>
        </div>
      </div>

      {!isType1 && totalInterest > 0 && (
        <div className="mb-4 px-3 py-2 bg-amber-50 rounded-lg">
          <p className="text-xs text-amber-700">
            利率: {loan.interestRate}% ／ 利息総額: {formatCurrency(totalInterest)}
          </p>
        </div>
      )}

      <ProgressBar value={progress} color="bg-teal-500" />
    </Card>
  );
};

const ScholarshipTracker: React.FC = () => {
  const { scholarshipLoans, addScholarshipLoan, updateScholarshipLoan, deleteScholarshipLoan, fixedCosts, monthlyData } = useFinance();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newLoan, setNewLoan] = useState<Omit<ScholarshipLoan, 'id'>>({
    type: 'type1', label: '', totalBorrowed: 0, monthlyPayment: 0, interestRate: 0, repaymentStartMonth: ''
  });

  const handleAdd = () => {
    if (!newLoan.label || !newLoan.totalBorrowed || !newLoan.repaymentStartMonth) return;
    addScholarshipLoan(newLoan);
    showToast(`${newLoan.label} を登録しました`);
    setNewLoan({ type: 'type1', label: '', totalBorrowed: 0, monthlyPayment: 0, interestRate: 0, repaymentStartMonth: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const loan = scholarshipLoans.find(l => l.id === id);
    deleteScholarshipLoan(id);
    showToast(`${loan?.label || '奨学金'} を削除しました`);
  };

  const totalRemaining = scholarshipLoans.reduce((sum, loan) => sum + calculateRemainingBalance(loan, currentMonth()), 0);

  // 奨学金返済積立の累計を計算
  // 変動費から: 各月の「奨学金返済積立」カテゴリの合計
  const reserveFromVariable = monthlyData.reduce((sum, md) =>
    sum + md.variableCosts
      .filter(c => c.category === '奨学金返済積立')
      .reduce((s, c) => s + c.amount, 0),
    0
  );
  // 固定費から: 「奨学金返済積立」カテゴリの月額 × 登録済み月数
  const reserveMonthlyFromFixed = fixedCosts
    .filter(c => c.category === '奨学金返済積立')
    .reduce((s, c) => s + c.amount, 0);
  const reserveMonthsCount = monthlyData.length || 1;
  const reserveFromFixed = reserveMonthlyFromFixed * reserveMonthsCount;

  const totalReserve = reserveFromVariable + reserveFromFixed;
  const effectiveRemaining = Math.max(0, totalRemaining - totalReserve);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<GraduationCap className="w-6 h-6 text-teal-500" />}
        title="奨学金返済トラッカー"
        description="返済残高と進捗を確認できます。"
      >
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'info'} aria-label={showForm ? 'キャンセル' : '奨学金を追加'}>
          {showForm ? <><X className="w-4 h-4 mr-1" />キャンセル</> : <><Plus className="w-4 h-4 mr-1" />追加</>}
        </Button>
      </PageHeader>

      {/* Summary */}
      {scholarshipLoans.length > 0 && (
        <Card className="bg-gradient-to-br from-teal-600 to-teal-800 text-white border-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium text-white">返済残高</span>
              </div>
              <div className="text-3xl font-bold tracking-tight">{formatCurrency(totalRemaining)}</div>
            </div>
            {totalReserve > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">積立累計</span>
                </div>
                <div className="text-3xl font-bold tracking-tight text-teal-200">- {formatCurrency(totalReserve)}</div>
              </div>
            )}
            {totalReserve > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-white">実質残高</span>
                </div>
                <div className="text-3xl font-bold tracking-tight text-white">{formatCurrency(effectiveRemaining)}</div>
              </div>
            )}
          </div>
          {totalReserve > 0 && (
            <p className="text-xs text-teal-200 mt-3">
              固定費の積立: {formatCurrency(reserveMonthlyFromFixed)}/月 × {reserveMonthsCount}ヶ月 = {formatCurrency(reserveFromFixed)}
              {reserveFromVariable > 0 && <> ＋ 変動費の積立: {formatCurrency(reserveFromVariable)}</>}
            </p>
          )}
        </Card>
      )}

      {/* Add Form */}
      {showForm && (
        <Card color="teal">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">新規登録</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">名前</label>
              <Input value={newLoan.label} onChange={(e) => setNewLoan({ ...newLoan, label: e.target.value })} placeholder="例: 第一種奨学金" aria-label="奨学金の名前" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">種類</label>
              <select
                value={newLoan.type}
                onChange={(e) => setNewLoan({ ...newLoan, type: e.target.value as 'type1' | 'type2', interestRate: e.target.value === 'type1' ? 0 : newLoan.interestRate })}
                className="block w-full rounded-lg border-slate-300 shadow-sm py-2.5 px-3 bg-white text-slate-900 text-sm min-h-[44px]"
                style={{ colorScheme: 'light' }}
                aria-label="奨学金の種類"
              >
                <option value="type1">第一種（無利子）</option>
                <option value="type2">第二種（有利子）</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">借入総額</label>
              <Input type="number" value={newLoan.totalBorrowed || ''} onChange={(e) => setNewLoan({ ...newLoan, totalBorrowed: Number(e.target.value) || 0 })} placeholder="0" inputMode="numeric" aria-label="借入総額" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">月額返済</label>
              <Input type="number" value={newLoan.monthlyPayment || ''} onChange={(e) => setNewLoan({ ...newLoan, monthlyPayment: Number(e.target.value) || 0 })} placeholder="0" inputMode="numeric" aria-label="月額返済" />
            </div>
            {newLoan.type === 'type2' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">年利 (%)</label>
                <Input type="number" step="any" value={newLoan.interestRate || ''} onChange={(e) => setNewLoan({ ...newLoan, interestRate: Number(e.target.value) || 0 })} placeholder="0.5" aria-label="年利" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">返済開始月</label>
              <Input type="month" value={newLoan.repaymentStartMonth} onChange={(e) => setNewLoan({ ...newLoan, repaymentStartMonth: e.target.value })} aria-label="返済開始月" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAdd} variant="info" disabled={!newLoan.label || !newLoan.totalBorrowed || !newLoan.repaymentStartMonth} aria-label="奨学金を登録">
              <Plus className="w-4 h-4 mr-1" />登録
            </Button>
          </div>
        </Card>
      )}

      {/* Loan Cards */}
      {scholarshipLoans.length === 0 && !showForm && (
        <div className="text-center py-16 bg-teal-50/50 rounded-xl border-2 border-dashed border-teal-200 text-slate-500">
          <GraduationCap className="w-12 h-12 mx-auto mb-3 text-teal-300" />
          <p>奨学金が登録されていません。</p>
          <p className="text-sm mt-1">「追加」ボタンから登録してください。</p>
        </div>
      )}

      <div className="space-y-4">
        {scholarshipLoans.map((loan) => (
          <LoanCard key={loan.id} loan={loan} onUpdate={updateScholarshipLoan} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
};

export default ScholarshipTracker;
