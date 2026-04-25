import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, Trash2, Edit3, X, Check, Target } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { Card, Button, Input, ProgressBar, PageHeader, IconButton, useToast } from './UIComponents';
import { SavingsGoal } from '../types';

const GoalCard: React.FC<{
  goal: SavingsGoal;
  onUpdate: (id: string, updates: Partial<SavingsGoal>) => void;
  onDelete: (id: string) => void;
  onSavingsAdded: (name: string, amount: number) => void;
}> = ({ goal, onUpdate, onDelete, onSavingsAdded }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(goal);
  const [addAmount, setAddAmount] = useState('');

  // Sync form state when goal prop changes (e.g., after adding savings)
  useEffect(() => {
    if (!editing) setForm(goal);
  }, [goal, editing]);

  const handleStartEditing = () => {
    setForm(goal); // Reset form to current prop values to avoid stale state
    setEditing(true);
  };

  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  // Parse deadline as local date to avoid UTC/local mismatch
  const [dlYear, dlMonth] = (goal.deadline || '').split('-').map(Number);
  const now = new Date();
  const monthsLeft = (dlYear && dlMonth)
    ? (dlYear - now.getFullYear()) * 12 + (dlMonth - now.getMonth() - 1)
    : 0;
  const monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;

  const handleSave = () => {
    onUpdate(goal.id, form);
    setEditing(false);
  };

  const handleAddSavings = () => {
    const amount = parseInt(addAmount) || 0;
    if (amount > 0) {
      onUpdate(goal.id, { currentAmount: goal.currentAmount + amount });
      onSavingsAdded(goal.name, amount);
      setAddAmount('');
    }
  };

  if (editing) {
    return (
      <Card color="emerald">
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
              <label className="block text-xs font-medium text-slate-500 mb-1">目標名</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="目標名" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">目標金額</label>
              <Input type="number" value={form.targetAmount || ''} onChange={(e) => setForm({ ...form, targetAmount: Number(e.target.value) || 0 })} inputMode="numeric" aria-label="目標金額" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">現在の貯金額</label>
              <Input type="number" value={form.currentAmount || ''} onChange={(e) => setForm({ ...form, currentAmount: Number(e.target.value) || 0 })} inputMode="numeric" aria-label="現在の貯金額" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">目標期限</label>
              <Input type="month" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} aria-label="目標期限" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card color="emerald">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-500" />
            {goal.name}
          </h4>
          <p className="text-sm text-slate-500 mt-0.5">期限: {goal.deadline}</p>
        </div>
        <div className="flex gap-1">
          <IconButton label="編集" onClick={handleStartEditing}>
            <Edit3 className="w-4 h-4" />
          </IconButton>
          <IconButton variant="danger" label="削除" onClick={() => onDelete(goal.id)}>
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500">目標額</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(goal.targetAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">貯金済み</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(goal.currentAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">あと</p>
          <p className="text-lg font-bold text-slate-800">{formatCurrency(remaining)}</p>
        </div>
      </div>

      <ProgressBar value={progress} color="bg-emerald-500" />

      {monthsLeft > 0 && remaining > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          残り{monthsLeft}ヶ月 ／ 月あたり {formatCurrency(monthlyNeeded)} 必要
        </p>
      )}

      {/* Quick add savings */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
        <div className="relative flex-grow">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
          <Input
            type="number"
            className="pl-7"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            placeholder="貯金額を追加"
            inputMode="numeric"
            aria-label="追加する貯金額"
          />
        </div>
        <Button variant="success" onClick={handleAddSavings} disabled={!addAmount} aria-label="貯金を追加">
          <Plus className="w-4 h-4 mr-1" />追加
        </Button>
      </div>
    </Card>
  );
};

const SavingsGoalTracker: React.FC = () => {
  const { savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } = useFinance();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState<Omit<SavingsGoal, 'id'>>({
    name: '', targetAmount: 0, currentAmount: 0, deadline: ''
  });

  const handleAdd = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.deadline) return;
    addSavingsGoal(newGoal);
    showToast(`${newGoal.name} を追加しました`);
    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, deadline: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const goal = savingsGoals.find(g => g.id === id);
    deleteSavingsGoal(id);
    showToast(`${goal?.name || '目標'} を削除しました`);
  };

  const handleSavingsAdded = (name: string, amount: number) => {
    showToast(`${name} に ${formatCurrency(amount)} を追加しました`);
  };

  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<PiggyBank className="w-6 h-6 text-emerald-500" />}
        title="貯金目標トラッカー"
        description="目標に向けた貯金の進捗を管理します。"
      >
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'success'} aria-label={showForm ? 'キャンセル' : '目標を追加'}>
          {showForm ? <><X className="w-4 h-4 mr-1" />キャンセル</> : <><Plus className="w-4 h-4 mr-1" />目標追加</>}
        </Button>
      </PageHeader>

      {/* Summary */}
      {savingsGoals.length > 0 && (
        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-none">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-5 h-5" />
            <span className="text-sm font-medium text-white">貯金総額</span>
          </div>
          <div className="text-4xl font-bold tracking-tight">{formatCurrency(totalSaved)}</div>
          <p className="text-sm text-white mt-2">目標合計 {formatCurrency(totalTarget)}</p>
        </Card>
      )}

      {/* Add Form */}
      {showForm && (
        <Card color="emerald">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">新規目標</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">目標名</label>
              <Input value={newGoal.name} onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="例: 旅行資金" aria-label="目標名" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">目標金額</label>
              <Input type="number" value={newGoal.targetAmount || ''} onChange={(e) => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) || 0 })} placeholder="0" inputMode="numeric" aria-label="目標金額" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">現在の貯金額</label>
              <Input type="number" value={newGoal.currentAmount || ''} onChange={(e) => setNewGoal({ ...newGoal, currentAmount: Number(e.target.value) || 0 })} placeholder="0" inputMode="numeric" aria-label="現在の貯金額" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">目標期限</label>
              <Input type="month" value={newGoal.deadline} onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })} aria-label="目標期限" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAdd} variant="success" disabled={!newGoal.name || !newGoal.targetAmount || !newGoal.deadline} aria-label="目標を登録">
              <Plus className="w-4 h-4 mr-1" />登録
            </Button>
          </div>
        </Card>
      )}

      {/* Goal Cards */}
      {savingsGoals.length === 0 && !showForm && (
        <div className="text-center py-16 bg-emerald-50/50 rounded-xl border-2 border-dashed border-emerald-200 text-slate-500">
          <PiggyBank className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
          <p>貯金目標が登録されていません。</p>
          <p className="text-sm mt-1">「目標追加」から始めましょう。</p>
        </div>
      )}

      <div className="space-y-4">
        {savingsGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} onUpdate={updateSavingsGoal} onDelete={handleDelete} onSavingsAdded={handleSavingsAdded} />
        ))}
      </div>
    </div>
  );
};

export default SavingsGoalTracker;
