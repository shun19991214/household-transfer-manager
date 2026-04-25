import React, { useState, useMemo } from 'react';
import { Landmark, GraduationCap, PiggyBank, Plus, Trash2, Edit3, X, Check, TrendingDown, Target, Sliders } from 'lucide-react';
import { ResponsiveBar } from '@nivo/bar';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { calculateRemainingBalance, calculatePayoffDate, calculateProgress, calculateTotalInterest } from '../utils/scholarship';
import { simulateScholarshipRepayment, simulateSavingsGrowth } from '../utils/simulation';
import { Card, Button, Input, ProgressBar, PageHeader, IconButton, useToast } from './UIComponents';
import { ScholarshipLoan, SavingsGoal, CATEGORY_COLORS, DEFAULT_BONUS_MONTHS } from '../types';

const currentMonth = () => new Date().toISOString().slice(0, 7);

// ============ Scholarship Section ============
const LoanCard: React.FC<{
  loan: ScholarshipLoan;
  onUpdate: (id: string, updates: Partial<ScholarshipLoan>) => void;
  onDelete: (id: string) => void;
}> = ({ loan, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(loan);

  const remaining = calculateRemainingBalance(loan, currentMonth());
  const payoffDate = calculatePayoffDate(loan);
  const progress = calculateProgress(loan, currentMonth());
  const totalInterest = calculateTotalInterest(loan);
  const isType1 = loan.type === 'type1';

  const handleSave = () => { onUpdate(loan.id, form); setEditing(false); };

  if (editing) {
    return (
      <Card color="teal">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-800 text-sm">編集中</span>
            <div className="flex gap-2">
              <Button variant="success" size="sm" onClick={handleSave} aria-label="保存"><Check className="w-4 h-4" /></Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)} aria-label="キャンセル"><X className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="名前" aria-label="名前" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'type1' | 'type2', interestRate: e.target.value === 'type1' ? 0 : form.interestRate })} className="rounded-lg border-slate-300 shadow-sm py-2 px-3 bg-white text-sm min-h-[44px]" style={{ colorScheme: 'light' }} aria-label="種類">
              <option value="type1">第一種（無利子）</option>
              <option value="type2">第二種（有利子）</option>
            </select>
            <Input type="number" value={form.totalBorrowed || ''} onChange={(e) => setForm({ ...form, totalBorrowed: Number(e.target.value) || 0 })} placeholder="借入総額" inputMode="numeric" aria-label="借入総額" />
            <Input type="number" value={form.monthlyPayment || ''} onChange={(e) => setForm({ ...form, monthlyPayment: Number(e.target.value) || 0 })} placeholder="月額返済" inputMode="numeric" aria-label="月額返済" />
            {form.type === 'type2' && (
              <Input type="number" step="any" value={form.interestRate || ''} onChange={(e) => setForm({ ...form, interestRate: Number(e.target.value) || 0 })} placeholder="年利 (%)" aria-label="年利" />
            )}
            <Input type="month" value={form.repaymentStartMonth} onChange={(e) => setForm({ ...form, repaymentStartMonth: e.target.value })} aria-label="返済開始月" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card color="teal">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">{loan.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isType1 ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
              {isType1 ? '無利子' : '有利子'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">開始: {loan.repaymentStartMonth} ・ 完済: {payoffDate}</p>
        </div>
        <div className="flex gap-1">
          <IconButton label="編集" onClick={() => { setForm(loan); setEditing(true); }}><Edit3 className="w-4 h-4" /></IconButton>
          <IconButton variant="danger" label="削除" onClick={() => onDelete(loan.id)}><Trash2 className="w-4 h-4" /></IconButton>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
        <div><p className="text-xs text-slate-500">借入額</p><p className="font-bold text-sm">{formatCurrency(loan.totalBorrowed)}</p></div>
        <div><p className="text-xs text-slate-500">残高</p><p className="font-bold text-sm text-teal-600">{formatCurrency(remaining)}</p></div>
        <div><p className="text-xs text-slate-500">月額</p><p className="font-bold text-sm">{formatCurrency(loan.monthlyPayment)}</p></div>
      </div>
      {!isType1 && totalInterest > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mb-2">利率 {loan.interestRate}% ・ 利息総額 {formatCurrency(totalInterest)}</p>
      )}
      <ProgressBar value={progress} color="bg-teal-500" />
    </Card>
  );
};

// ============ Savings Section ============
const GoalCard: React.FC<{
  goal: SavingsGoal;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string) => void;
}> = ({ goal, onUpdate, onDelete, showToast }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(goal);
  const [addAmount, setAddAmount] = useState('');

  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const [dlYear, dlMonth] = (goal.deadline || '').split('-').map(Number);
  const now = new Date();
  const monthsLeft = dlYear ? (dlYear - now.getFullYear()) * 12 + (dlMonth - now.getMonth() - 1) : 0;
  const monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;

  const handleSave = () => { onUpdate(goal.id, form); setEditing(false); };
  const handleAddSavings = () => {
    const amount = parseInt(addAmount) || 0;
    if (amount > 0) {
      onUpdate(goal.id, { currentAmount: goal.currentAmount + amount });
      showToast(`${goal.name} に ${formatCurrency(amount)} を追加`);
      setAddAmount('');
    }
  };

  if (editing) {
    return (
      <Card color="emerald">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-800 text-sm">編集中</span>
            <div className="flex gap-2">
              <Button variant="success" size="sm" onClick={handleSave} aria-label="保存"><Check className="w-4 h-4" /></Button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(false)} aria-label="キャンセル"><X className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="目標名" aria-label="目標名" />
            <Input type="number" value={form.targetAmount || ''} onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) || 0 })} placeholder="目標額" inputMode="numeric" aria-label="目標金額" />
            <Input type="number" value={form.currentAmount || ''} onChange={(e) => setForm({ ...form, currentAmount: Number(e.target.value) || 0 })} placeholder="現在額" inputMode="numeric" aria-label="現在額" />
            <Input type="month" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} aria-label="期限" />
            <Input type="number" value={form.monthlyContribution || ''} onChange={(e) => setForm({ ...form, monthlyContribution: Number(e.target.value) || 0 })} placeholder="月額積立" inputMode="numeric" aria-label="月額積立" />
            <Input type="number" value={form.bonusContribution || ''} onChange={(e) => setForm({ ...form, bonusContribution: Number(e.target.value) || 0 })} placeholder="ボーナス積立(1回)" inputMode="numeric" aria-label="ボーナス積立" />
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">ボーナス月</p>
            <BonusMonthsPicker
              value={(form.bonusMonths && form.bonusMonths.length > 0) ? form.bonusMonths : DEFAULT_BONUS_MONTHS}
              onChange={(m) => setForm({ ...form, bonusMonths: m })}
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card color="emerald">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="font-bold text-slate-800 flex items-center gap-1">
            <Target className="w-4 h-4 text-emerald-500" /> {goal.name}
          </span>
          <p className="text-xs text-slate-500 mt-0.5">期限: {goal.deadline} {monthsLeft > 0 && `（残り${monthsLeft}ヶ月）`}</p>
        </div>
        <div className="flex gap-1">
          <IconButton label="編集" onClick={() => { setForm(goal); setEditing(true); }}><Edit3 className="w-4 h-4" /></IconButton>
          <IconButton variant="danger" label="削除" onClick={() => onDelete(goal.id)}><Trash2 className="w-4 h-4" /></IconButton>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
        <div><p className="text-xs text-slate-500">目標</p><p className="font-bold text-sm">{formatCurrency(goal.targetAmount)}</p></div>
        <div><p className="text-xs text-slate-500">貯金済</p><p className="font-bold text-sm text-emerald-600">{formatCurrency(goal.currentAmount)}</p></div>
        <div><p className="text-xs text-slate-500">あと</p><p className="font-bold text-sm">{formatCurrency(remaining)}</p></div>
      </div>
      <ProgressBar value={progress} color="bg-emerald-500" />
      {monthsLeft > 0 && remaining > 0 && (
        <p className="text-xs text-slate-500 mt-1">月あたり {formatCurrency(monthlyNeeded)} 必要</p>
      )}
      {(goal.monthlyContribution || goal.bonusContribution) ? (
        <p className="text-xs text-slate-500 mt-1">
          {goal.monthlyContribution ? `月額 ${formatCurrency(goal.monthlyContribution)}` : ''}
          {goal.monthlyContribution && goal.bonusContribution ? ' ・ ' : ''}
          {goal.bonusContribution
            ? `ボーナス ${formatCurrency(goal.bonusContribution)} × ${((goal.bonusMonths && goal.bonusMonths.length > 0) ? goal.bonusMonths : DEFAULT_BONUS_MONTHS).map(m => `${m}月`).join('・')}`
            : ''}
        </p>
      ) : null}
      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
          <Input type="number" className="pl-7" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="貯金額を追加" inputMode="numeric" aria-label="追加する貯金額" />
        </div>
        <Button variant="success" onClick={handleAddSavings} disabled={!addAmount} aria-label="貯金を追加">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

// ============ Simulation Chart (shared) ============
const SimChart: React.FC<{ data: any[]; keys: string[]; colors: string[] }> = ({ data, keys, colors }) => {
  if (data.length < 2) return <p className="text-sm text-slate-400 py-6 text-center">データ不足</p>;
  const filtered = data.length > 40 ? data.filter((_, i) => i % 3 === 0 || i === data.length - 1) : data;
  return (
    <div className="h-[280px]">
      <ResponsiveBar
        data={filtered} keys={keys} indexBy="label"
        margin={{ top: 10, right: 10, bottom: 50, left: 70 }}
        padding={0.3} groupMode="stacked" colors={colors} borderRadius={2}
        axisBottom={{ tickSize: 5, tickPadding: 5, tickRotation: -45, format: (v: string) => v.slice(2) }}
        axisLeft={{ tickSize: 5, tickPadding: 5, format: (v: number) => `${(v / 10000).toFixed(0)}万` }}
        enableLabel={false}
        tooltip={({ id, value, color }: Record<string, unknown>) => (
          <div className="bg-white shadow-lg rounded-lg px-3 py-2 border border-slate-200 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color as string }} />
            <span className="text-sm font-medium text-slate-700">{String(id)}: {formatCurrency(value as number)}</span>
          </div>
        )}
        theme={{ axis: { ticks: { text: { fill: '#64748b', fontSize: 10 } } }, grid: { line: { stroke: '#e2e8f0' } } }}
      />
    </div>
  );
};

// ============ Bonus Months Picker ============
const BonusMonthsPicker: React.FC<{
  value: number[];
  onChange: (months: number[]) => void;
}> = ({ value, onChange }) => {
  const set = new Set<number>(value);
  const toggle = (m: number) => {
    const next = new Set<number>(set);
    if (next.has(m)) next.delete(m); else next.add(m);
    onChange(Array.from(next).sort((a: number, b: number) => a - b));
  };
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
        <button
          key={m}
          type="button"
          onClick={() => toggle(m)}
          className={`min-w-[36px] px-2 py-1 rounded-md text-xs border transition-colors ${
            set.has(m)
              ? 'bg-teal-500 text-white border-teal-500'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
          aria-label={`${m}月をボーナス月に${set.has(m) ? '含めない' : '含める'}`}
          aria-pressed={set.has(m)}
        >
          {m}
        </button>
      ))}
    </div>
  );
};

// ============ Reserve Initial Editor ============
const ReserveInitialEditor: React.FC<{
  value: number;
  onChange: (v: number) => void;
  monthlyAvg: number;
  fromHistory: number;
  bonusValue: number;
  onBonusChange: (v: number) => void;
  bonusMonths: number[];
  onBonusMonthsChange: (m: number[]) => void;
}> = ({ value, onChange, monthlyAvg, fromHistory, bonusValue, onBonusChange, bonusMonths, onBonusMonthsChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || ''));
  const [bonusDraft, setBonusDraft] = useState(String(bonusValue || ''));

  const startEdit = () => {
    setDraft(String(value || ''));
    setBonusDraft(String(bonusValue || ''));
    setEditing(true);
  };
  const save = () => {
    onChange(Number(draft) || 0);
    onBonusChange(Number(bonusDraft) || 0);
    setEditing(false);
  };
  const cancel = () => { setEditing(false); };

  const months = bonusMonths.length > 0 ? bonusMonths : DEFAULT_BONUS_MONTHS;

  return (
    <Card color="teal">
      <div className="space-y-3">
        {/* Header with edit toggle visible at all times */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">積立の設定</h3>
          {editing ? (
            <div className="flex gap-2">
              <Button variant="success" size="sm" onClick={save} aria-label="保存"><Check className="w-4 h-4 mr-1" />保存</Button>
              <Button variant="secondary" size="sm" onClick={cancel} aria-label="キャンセル"><X className="w-4 h-4 mr-1" />キャンセル</Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={startEdit} aria-label="積立設定を編集"><Edit3 className="w-4 h-4 mr-1" />編集</Button>
          )}
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">積立の初期値（月次データに記録されていない既存の積立額）</p>
          {editing ? (
            <div className="flex gap-2 items-center">
              <span className="text-slate-400">¥</span>
              <Input
                type="number"
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="例: 500000"
                aria-label="積立の初期値"
              />
            </div>
          ) : (
            <p className="text-xl font-bold text-teal-700">{formatCurrency(value)}</p>
          )}
        </div>

        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500 mb-1">ボーナス積立（1回あたり）</p>
          {editing ? (
            <div className="flex gap-2 items-center mb-2">
              <span className="text-slate-400">¥</span>
              <Input
                type="number"
                inputMode="numeric"
                value={bonusDraft}
                onChange={(e) => setBonusDraft(e.target.value)}
                placeholder="例: 100000"
                aria-label="ボーナス1回あたりの積立額"
              />
            </div>
          ) : (
            <p className="text-base font-bold text-teal-700">{formatCurrency(bonusValue)}</p>
          )}
          <p className="text-[11px] text-slate-500 mt-2 mb-1">ボーナス月（クリックで切替・保存不要）</p>
          <BonusMonthsPicker value={months} onChange={onBonusMonthsChange} />
        </div>

        <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-200 pt-2">
          <p>＋ 月次データから自動集計: {formatCurrency(fromHistory)}</p>
          <p>＋ 月あたり積立見込み: {formatCurrency(monthlyAvg)}</p>
          {bonusValue > 0 && (
            <p>＋ ボーナス積立: {formatCurrency(bonusValue)} × 年{months.length}回（{months.map(m => `${m}月`).join('・')}）</p>
          )}
        </div>
      </div>
    </Card>
  );
};

// ============ Main AssetManager ============
const AssetManager: React.FC = () => {
  const { scholarshipLoans, addScholarshipLoan, updateScholarshipLoan, deleteScholarshipLoan,
    savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    fixedCosts, monthlyData,
    scholarshipReserveInitial, setScholarshipReserveInitial,
    scholarshipReserveBonus, setScholarshipReserveBonus,
    scholarshipReserveBonusMonths, setScholarshipReserveBonusMonths } = useFinance();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'scholarship' | 'savings'>('scholarship');
  const [simMonths, setSimMonths] = useState(60);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Scholarship add form
  const [newLoan, setNewLoan] = useState<Omit<ScholarshipLoan, 'id'>>({ type: 'type1', label: '', totalBorrowed: 0, monthlyPayment: 0, interestRate: 0, repaymentStartMonth: '' });
  const handleAddLoan = () => {
    if (!newLoan.label || !newLoan.totalBorrowed || !newLoan.repaymentStartMonth) return;
    addScholarshipLoan(newLoan);
    showToast(`${newLoan.label} を登録しました`);
    setNewLoan({ type: 'type1', label: '', totalBorrowed: 0, monthlyPayment: 0, interestRate: 0, repaymentStartMonth: '' });
    setShowLoanForm(false);
  };
  const handleDeleteLoan = (id: string) => {
    const loan = scholarshipLoans.find(l => l.id === id);
    deleteScholarshipLoan(id);
    showToast(`${loan?.label || '奨学金'} を削除しました`);
  };

  // Savings add form
  const emptyGoal: Omit<SavingsGoal, 'id'> = {
    name: '', targetAmount: 0, currentAmount: 0, deadline: '',
    monthlyContribution: 0, bonusContribution: 0, bonusMonths: DEFAULT_BONUS_MONTHS,
  };
  const [newGoal, setNewGoal] = useState<Omit<SavingsGoal, 'id'>>(emptyGoal);
  const handleAddGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) return;
    addSavingsGoal(newGoal);
    showToast(`${newGoal.name} を追加しました`);
    setNewGoal(emptyGoal);
    setShowGoalForm(false);
  };
  const handleDeleteGoal = (id: string) => {
    const g = savingsGoals.find(g => g.id === id);
    deleteSavingsGoal(id);
    showToast(`${g?.name || '目標'} を削除しました`);
  };

  // Totals
  const totalRemaining = scholarshipLoans.reduce((s, l) => s + calculateRemainingBalance(l, currentMonth()), 0);
  const reserveFromVariable = monthlyData.reduce((sum, md) => sum + md.variableCosts.filter(c => c.category === '奨学金返済積立').reduce((s, c) => s + c.amount, 0), 0);
  const monthlyFixedReserve = fixedCosts.filter(c => c.category === '奨学金返済積立').reduce((s, c) => s + c.amount, 0);
  const reserveFromFixed = monthlyFixedReserve * (monthlyData.length || 1);
  const totalReserve = scholarshipReserveInitial + reserveFromVariable + reserveFromFixed;
  const effectiveRemaining = Math.max(0, totalRemaining - totalReserve);

  // 月次積立額の見込み: 固定費の積立 + 過去変動費の月平均
  const variableReserveAvg = monthlyData.length > 0
    ? Math.round(reserveFromVariable / monthlyData.length)
    : 0;
  const monthlyReserveEstimate = monthlyFixedReserve + variableReserveAvg;

  const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);

  // Simulations
  const cm = currentMonth();
  const loanSim = useMemo(
    () => simulateScholarshipRepayment(
      scholarshipLoans, cm, simMonths, totalReserve, monthlyReserveEstimate,
      scholarshipReserveBonus,
      scholarshipReserveBonusMonths.length > 0 ? scholarshipReserveBonusMonths : DEFAULT_BONUS_MONTHS,
    ),
    [scholarshipLoans, cm, simMonths, totalReserve, monthlyReserveEstimate, scholarshipReserveBonus, scholarshipReserveBonusMonths]
  );
  const savingsSim = useMemo(() => simulateSavingsGrowth(savingsGoals, cm, simMonths), [savingsGoals, cm, simMonths]);

  // シミュレーション末尾の見込み
  const loanSimLast = loanSim[loanSim.length - 1];
  const projectedRemaining = (loanSimLast?.['合計'] as number) ?? 0;
  const projectedReserve = (loanSimLast?.['積立累計'] as number) ?? 0;
  const projectedEffective = (loanSimLast?.['実質残高'] as number) ?? 0;
  // 実質残高が初めて 0 になる月（実質完済予定月）
  const effectivePayoffMonth = (() => {
    const hit = loanSim.find(p => (p['実質残高'] as number) <= 0);
    return hit ? (hit.month as string) : null;
  })();

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<Landmark className="w-6 h-6 text-teal-500" />}
        title="資産管理"
        description="奨学金返済と貯金目標をまとめて管理します。"
      />

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <Button variant={tab === 'scholarship' ? 'info' : 'secondary'} onClick={() => setTab('scholarship')} aria-label="奨学金タブ">
          <GraduationCap className="w-4 h-4 mr-1" /> 奨学金
          {scholarshipLoans.length > 0 && <span className="ml-1 text-xs opacity-80">({scholarshipLoans.length})</span>}
        </Button>
        <Button variant={tab === 'savings' ? 'success' : 'secondary'} onClick={() => setTab('savings')} aria-label="貯金タブ">
          <PiggyBank className="w-4 h-4 mr-1" /> 貯金
          {savingsGoals.length > 0 && <span className="ml-1 text-xs opacity-80">({savingsGoals.length})</span>}
        </Button>
      </div>

      {/* ======== Scholarship Tab ======== */}
      {tab === 'scholarship' && (
        <div className="space-y-4">
          {/* Summary */}
          {scholarshipLoans.length > 0 && (
            <Card className="bg-gradient-to-br from-teal-600 to-teal-800 text-white border-none">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-teal-200">返済残高</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRemaining)}</p>
                </div>
                {totalReserve > 0 && (
                  <>
                    <div>
                      <p className="text-xs text-teal-200">積立累計</p>
                      <p className="text-2xl font-bold text-teal-200">- {formatCurrency(totalReserve)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-teal-200">実質残高</p>
                      <p className="text-2xl font-bold">{formatCurrency(effectiveRemaining)}</p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* 積立初期値の設定 */}
          {scholarshipLoans.length > 0 && (
            <ReserveInitialEditor
              value={scholarshipReserveInitial}
              onChange={setScholarshipReserveInitial}
              monthlyAvg={monthlyFixedReserve + (monthlyData.length > 0 ? Math.round(reserveFromVariable / monthlyData.length) : 0)}
              fromHistory={reserveFromVariable + reserveFromFixed}
              bonusValue={scholarshipReserveBonus}
              onBonusChange={setScholarshipReserveBonus}
              bonusMonths={scholarshipReserveBonusMonths}
              onBonusMonthsChange={setScholarshipReserveBonusMonths}
            />
          )}

          {/* Add button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowLoanForm(!showLoanForm)} variant={showLoanForm ? 'secondary' : 'info'} size="sm">
              {showLoanForm ? <><X className="w-4 h-4 mr-1" />キャンセル</> : <><Plus className="w-4 h-4 mr-1" />追加</>}
            </Button>
          </div>

          {/* Add form */}
          {showLoanForm && (
            <Card color="teal">
              <div className="grid grid-cols-2 gap-3">
                <Input value={newLoan.label} onChange={(e) => setNewLoan({ ...newLoan, label: e.target.value })} placeholder="名前" aria-label="名前" />
                <select value={newLoan.type} onChange={(e) => setNewLoan({ ...newLoan, type: e.target.value as 'type1' | 'type2', interestRate: e.target.value === 'type1' ? 0 : newLoan.interestRate })} className="rounded-lg border-slate-300 shadow-sm py-2 px-3 bg-white text-sm min-h-[44px]" style={{ colorScheme: 'light' }}>
                  <option value="type1">第一種（無利子）</option>
                  <option value="type2">第二種（有利子）</option>
                </select>
                <Input type="number" value={newLoan.totalBorrowed || ''} onChange={(e) => setNewLoan({ ...newLoan, totalBorrowed: Number(e.target.value) || 0 })} placeholder="借入総額" inputMode="numeric" />
                <Input type="number" value={newLoan.monthlyPayment || ''} onChange={(e) => setNewLoan({ ...newLoan, monthlyPayment: Number(e.target.value) || 0 })} placeholder="月額返済" inputMode="numeric" />
                {newLoan.type === 'type2' && <Input type="number" step="any" value={newLoan.interestRate || ''} onChange={(e) => setNewLoan({ ...newLoan, interestRate: Number(e.target.value) || 0 })} placeholder="年利(%)" />}
                <Input type="month" value={newLoan.repaymentStartMonth} onChange={(e) => setNewLoan({ ...newLoan, repaymentStartMonth: e.target.value })} aria-label="返済開始月" />
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleAddLoan} variant="info" size="sm" disabled={!newLoan.label || !newLoan.totalBorrowed || !newLoan.repaymentStartMonth}><Plus className="w-4 h-4 mr-1" />登録</Button>
              </div>
            </Card>
          )}

          {/* Loan cards */}
          {scholarshipLoans.length === 0 && !showLoanForm && (
            <div className="text-center py-12 bg-teal-50/50 rounded-xl border-2 border-dashed border-teal-200 text-slate-500">
              <GraduationCap className="w-10 h-10 mx-auto mb-2 text-teal-300" />
              <p>奨学金が未登録です</p>
            </div>
          )}
          {scholarshipLoans.map(loan => (
            <LoanCard key={loan.id} loan={loan} onUpdate={updateScholarshipLoan} onDelete={handleDeleteLoan} />
          ))}

          {/* Inline Simulation */}
          {scholarshipLoans.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <Sliders className="w-4 h-4" /> 返済シミュレーション
                </h3>
                <select value={simMonths} onChange={(e) => setSimMonths(Number(e.target.value))} className="rounded-lg border-slate-300 py-1 px-2 text-xs min-h-[36px]" style={{ colorScheme: 'light' }}>
                  <option value={24}>2年</option><option value={36}>3年</option><option value={60}>5年</option><option value={120}>10年</option><option value={240}>20年</option>
                </select>
              </div>
              <SimChart
                data={loanSim}
                keys={['実質残高']}
                colors={[CATEGORY_COLORS['奨学金']]}
              />
              <p className="text-[11px] text-slate-500 -mt-1 text-right">
                バー＝返済残高から積立累計を差し引いた「実質残高」。0 になった月が実質完済の見込み。
              </p>
              {/* 見込みサマリー */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Card color="teal" className="text-center !p-3">
                  <p className="text-[10px] text-slate-500">実質完済予定</p>
                  <p className="text-base font-bold text-emerald-600">
                    {effectivePayoffMonth ?? '期間内未達'}
                  </p>
                </Card>
                <Card color="teal" className="text-center !p-3">
                  <p className="text-[10px] text-slate-500">期間末 実質残高</p>
                  <p className="text-base font-bold text-teal-700">{formatCurrency(projectedEffective)}</p>
                </Card>
                <Card color="teal" className="text-center !p-3">
                  <p className="text-[10px] text-slate-500">参考: 期間末 借入残高</p>
                  <p className="text-base font-bold text-slate-600">{formatCurrency(projectedRemaining)}</p>
                  <p className="text-[10px] text-slate-400">積立 {formatCurrency(projectedReserve)}</p>
                </Card>
              </div>
              {monthlyReserveEstimate > 0 && (
                <p className="text-xs text-slate-500">
                  月あたり積立見込み: {formatCurrency(monthlyReserveEstimate)}
                  （固定費 {formatCurrency(monthlyFixedReserve)} + 変動費月平均 {formatCurrency(variableReserveAvg)}）
                </p>
              )}
              {monthlyReserveEstimate === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
                  「奨学金返済積立」カテゴリの固定費・変動費を登録すると、シミュレーションに自動で反映されます。
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======== Savings Tab ======== */}
      {tab === 'savings' && (
        <div className="space-y-4">
          {/* Summary */}
          {savingsGoals.length > 0 && (
            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-none">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-emerald-200">貯金総額</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSaved)}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-200">目標合計</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalTarget)}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Add button */}
          <div className="flex justify-end">
            <Button onClick={() => setShowGoalForm(!showGoalForm)} variant={showGoalForm ? 'secondary' : 'success'} size="sm">
              {showGoalForm ? <><X className="w-4 h-4 mr-1" />キャンセル</> : <><Plus className="w-4 h-4 mr-1" />目標追加</>}
            </Button>
          </div>

          {/* Add form */}
          {showGoalForm && (
            <Card color="emerald">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  目標名
                  <Input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="例: 海外旅行" aria-label="目標名" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  目標額
                  <Input type="number" value={newGoal.targetAmount || ''} onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) || 0 })} placeholder="目標額" inputMode="numeric" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  現在額（初期値）
                  <Input type="number" value={newGoal.currentAmount || ''} onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) || 0 })} placeholder="既に貯まっている額" inputMode="numeric" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600">
                  期限
                  <Input type="month" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} aria-label="期限" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600 col-span-2">
                  月額積立（初期値）
                  <Input type="number" value={newGoal.monthlyContribution || ''} onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: Number(e.target.value) || 0 })} placeholder="毎月積み立てる金額（任意）" inputMode="numeric" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600 col-span-2">
                  ボーナス積立（1回あたり）
                  <Input type="number" value={newGoal.bonusContribution || ''} onChange={(e) => setNewGoal({ ...newGoal, bonusContribution: Number(e.target.value) || 0 })} placeholder="ボーナス時に追加で積み立てる金額（任意）" inputMode="numeric" />
                </label>
                <div className="col-span-2">
                  <p className="text-xs text-slate-600 mb-1">ボーナス月（クリックで切替）</p>
                  <BonusMonthsPicker
                    value={(newGoal.bonusMonths && newGoal.bonusMonths.length > 0) ? newGoal.bonusMonths : DEFAULT_BONUS_MONTHS}
                    onChange={(m) => setNewGoal({ ...newGoal, bonusMonths: m })}
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleAddGoal} variant="success" size="sm" disabled={!newGoal.name || !newGoal.targetAmount || !newGoal.deadline}><Plus className="w-4 h-4 mr-1" />登録</Button>
              </div>
            </Card>
          )}

          {/* Goal cards */}
          {savingsGoals.length === 0 && !showGoalForm && (
            <div className="text-center py-12 bg-emerald-50/50 rounded-xl border-2 border-dashed border-emerald-200 text-slate-500">
              <PiggyBank className="w-10 h-10 mx-auto mb-2 text-emerald-300" />
              <p>貯金目標が未登録です</p>
            </div>
          )}
          {savingsGoals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onUpdate={updateSavingsGoal} onDelete={handleDeleteGoal} showToast={showToast} />
          ))}

          {/* Inline Simulation */}
          {savingsGoals.length > 0 && (
            <div className="space-y-3 mt-6">
              {savingsGoals.some(g => !g.monthlyContribution) && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">各目標の「月額積立」を設定すると正確な予測になります（編集から設定可能）</p>
              )}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  <Sliders className="w-4 h-4" /> 貯金シミュレーション
                </h3>
                <select value={simMonths} onChange={(e) => setSimMonths(Number(e.target.value))} className="rounded-lg border-slate-300 py-1 px-2 text-xs min-h-[36px]" style={{ colorScheme: 'light' }}>
                  <option value={12}>1年</option><option value={24}>2年</option><option value={36}>3年</option><option value={60}>5年</option><option value={120}>10年</option>
                </select>
              </div>
              <SimChart data={savingsSim} keys={savingsGoals.map(g => g.name)} colors={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssetManager;
