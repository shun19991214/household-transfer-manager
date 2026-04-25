import React, { useState } from 'react';
import { Plus, Trash2, Layers, Cloud, AlertCircle, Building2, Edit3, Check, X } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { Button, Card, Input, PageHeader, IconButton, useToast } from './UIComponents';
import CategorySelect from './CategorySelect';
import BankAccountSelect from './BankAccountSelect';
import { ExpenseCategory, BankAccount } from '../types';

const FixedCostSettings: React.FC = () => {
  const {
    fixedCosts,
    addFixedCost,
    deleteFixedCost,
    updateFixedCost,
    isCloudEnabled,
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount
  } = useFinance();
  const { showToast } = useToast();

  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('その他');

  const totalFixed = fixedCosts.reduce((sum, item) => sum + item.amount, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAmount) return;
    const parsedAmount = parseInt(newAmount, 10);
    if (isNaN(parsedAmount)) return;
    addFixedCost(newName, parsedAmount, newCategory);
    showToast(`${newName} を追加しました`);
    setNewName('');
    setNewAmount('');
    setNewCategory('その他');
  };

  const handleDelete = (id: string) => {
    const item = fixedCosts.find(c => c.id === id);
    deleteFixedCost(id);
    showToast(`${item?.name || '固定費'} を削除しました`);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-24 md:pb-6">

      {/* Firebase Cloud Settings Section */}
      <section>
        <header className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Cloud className={`w-6 h-6 ${isCloudEnabled ? 'text-emerald-500' : 'text-slate-400'}`} />
            クラウド連携 (Google DB)
          </h2>
          <div className="flex gap-2">
            {isCloudEnabled ? (
              <span className="text-xs text-emerald-600 border border-emerald-200 px-2 py-1 rounded-full bg-emerald-50 font-medium">
                接続中 (自動同期)
              </span>
            ) : (
              <span className="text-xs text-slate-400 border border-slate-200 px-2 py-1 rounded-full bg-white">
                未接続
              </span>
            )}
          </div>
        </header>

        {!isCloudEnabled && (
          <Card className="mb-6" color="amber">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-amber-800">クラウド設定が未完了です</h3>
                <p className="text-xs text-amber-700 mt-1">
                  プロジェクトルートの <code className="bg-amber-100 px-1 rounded">supabaseConfig.ts</code> にSupabaseの設定情報を記述すると、データのクラウド保存・同期が有効になります。
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* Fixed Costs Section */}
      <section>
        <PageHeader
          icon={<Layers className="w-6 h-6 text-violet-500" />}
          title="固定費設定"
          description="毎月必ず発生する支払い（家賃、積立など）を設定します。"
        />

        <Card className="mt-4" color="violet">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">固定費合計</span>
            <span className="text-3xl font-bold text-violet-600">{formatCurrency(totalFixed)}</span>
          </div>

          <div className="space-y-4">
            {fixedCosts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-violet-50/50 rounded-lg border border-dashed border-violet-200">
                固定費が登録されていません。<br />下部のフォームから追加してください。
              </div>
            ) : (
              fixedCosts.map((item) => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input
                      value={item.name}
                      onChange={(e) => updateFixedCost(item.id, e.target.value, item.amount, item.category)}
                      placeholder="項目名"
                      aria-label="固定費項目名"
                    />
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
                      <Input
                        type="number"
                        className="pl-7"
                        value={item.amount || ''}
                        onChange={(e) => updateFixedCost(item.id, item.name, Number(e.target.value) || 0, item.category)}
                        placeholder="金額"
                        inputMode="numeric"
                        aria-label="固定費金額"
                      />
                    </div>
                    <CategorySelect
                      value={item.category}
                      onChange={(cat: ExpenseCategory) => updateFixedCost(item.id, item.name, item.amount, cat)}
                    />
                    <BankAccountSelect
                      value={item.bankAccountId}
                      onChange={(bankId) => updateFixedCost(item.id, item.name, item.amount, item.category, bankId || undefined)}
                    />
                  </div>
                  <IconButton variant="danger" label="削除" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-900 mb-3">新規追加</h3>
            <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
              <div className="flex-grow min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">項目名</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: 家賃"
                  aria-label="新しい固定費の項目名"
                />
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-500 mb-1">金額</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
                  <Input
                    type="number"
                    className="pl-7"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    aria-label="新しい固定費の金額"
                  />
                </div>
              </div>
              <div className="w-28">
                <label className="block text-xs font-medium text-slate-500 mb-1">カテゴリ</label>
                <CategorySelect value={newCategory} onChange={setNewCategory} />
              </div>
              <Button type="submit" disabled={!newName || !newAmount} aria-label="固定費を追加">
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </form>
          </div>
        </Card>
      </section>

      <hr className="border-slate-200" />

      {/* Bank Accounts Section */}
      <BankAccountManager
        bankAccounts={bankAccounts}
        onAdd={addBankAccount}
        onUpdate={updateBankAccount}
        onDelete={deleteBankAccount}
        showToast={showToast}
      />
    </div>
  );
};

// 銀行口座行（表示/編集切替）
const BankAccountRow: React.FC<{
  account: BankAccount;
  onUpdate: (id: string, updates: Partial<BankAccount>) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string) => void;
}> = ({ account, onUpdate, onDelete, showToast }) => {
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState(account);

  const handleSave = () => {
    if (!ef.bankName) return;
    onUpdate(account.id, {
      name: ef.name || `${ef.bankName} ${ef.accountType || '普通'}`,
      bankName: ef.bankName,
      branchName: ef.branchName || undefined,
      accountType: ef.accountType,
      accountNumber: ef.accountNumber || undefined,
    });
    showToast(`${ef.bankName} を更新しました`);
    setEditing(false);
  };

  if (editing) {
    return (
      <Card color="indigo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">銀行名</label>
            <Input value={ef.bankName} onChange={(e) => setEf({ ...ef, bankName: e.target.value })} aria-label="銀行名" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">支店名</label>
            <Input value={ef.branchName || ''} onChange={(e) => setEf({ ...ef, branchName: e.target.value })} aria-label="支店名" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">口座種別</label>
            <select
              value={ef.accountType || '普通'}
              onChange={(e) => setEf({ ...ef, accountType: e.target.value as '普通' | '当座' | '貯蓄' })}
              className="block w-full rounded-lg border-slate-300 shadow-sm py-2 px-3 bg-white text-slate-900 text-sm min-h-[44px]"
              style={{ colorScheme: 'light' }}
              aria-label="口座種別"
            >
              <option value="普通">普通</option>
              <option value="当座">当座</option>
              <option value="貯蓄">貯蓄</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">口座番号（下4桁）</label>
            <Input value={ef.accountNumber || ''} onChange={(e) => setEf({ ...ef, accountNumber: e.target.value })} maxLength={4} aria-label="口座番号" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="secondary" size="sm" onClick={() => { setEf(account); setEditing(false); }} aria-label="キャンセル">
            <X className="w-4 h-4 mr-1" />キャンセル
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!ef.bankName} aria-label="保存">
            <Check className="w-4 h-4 mr-1" />保存
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-800">
              {account.bankName}
              {account.branchName && <span className="text-slate-500"> {account.branchName}</span>}
            </p>
            <p className="text-xs text-slate-400">
              {account.accountType || '普通'}
              {account.accountNumber && ` *${account.accountNumber}`}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <IconButton label="編集" onClick={() => setEditing(true)}>
            <Edit3 className="w-4 h-4" />
          </IconButton>
          <IconButton variant="danger" label="削除" onClick={() => onDelete(account.id)}>
            <Trash2 className="w-4 h-4" />
          </IconButton>
        </div>
      </div>
    </Card>
  );
};

// 銀行マスタ管理コンポーネント
const BankAccountManager: React.FC<{
  bankAccounts: BankAccount[];
  onAdd: (account: Omit<BankAccount, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<BankAccount>) => void;
  onDelete: (id: string) => void;
  showToast: (msg: string) => void;
}> = ({ bankAccounts, onAdd, onUpdate, onDelete, showToast }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', bankName: '', branchName: '', accountType: '普通' as const, accountNumber: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankName) return;
    onAdd({
      name: form.name || `${form.bankName} ${form.accountType}`,
      bankName: form.bankName,
      branchName: form.branchName || undefined,
      accountType: form.accountType,
      accountNumber: form.accountNumber || undefined,
    });
    showToast(`${form.bankName} を追加しました`);
    setForm({ name: '', bankName: '', branchName: '', accountType: '普通', accountNumber: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const account = bankAccounts.find(a => a.id === id);
    onDelete(id);
    showToast(`${account?.bankName || '口座'} を削除しました`);
  };

  return (
    <section>
      <PageHeader
        icon={<Building2 className="w-6 h-6 text-blue-500" />}
        title="銀行口座マスタ"
        description="振り分け先の銀行口座を登録します。科目ごとに口座を指定できます。"
      >
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} aria-label={showForm ? 'キャンセル' : '口座を追加'}>
          {showForm ? 'キャンセル' : <><Plus className="w-4 h-4 mr-1" />追加</>}
        </Button>
      </PageHeader>

      {showForm && (
        <Card className="mt-4" color="indigo">
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">銀行名</label>
              <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="例: 三井住友銀行" aria-label="銀行名" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">支店名</label>
              <Input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} placeholder="例: 渋谷支店" aria-label="支店名" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">口座種別</label>
              <select
                value={form.accountType}
                onChange={(e) => setForm({ ...form, accountType: e.target.value as '普通' | '当座' | '貯蓄' })}
                className="block w-full rounded-lg border-slate-300 shadow-sm py-2 px-3 bg-white text-slate-900 text-sm min-h-[44px]"
                style={{ colorScheme: 'light' }}
                aria-label="口座種別"
              >
                <option value="普通">普通</option>
                <option value="当座">当座</option>
                <option value="貯蓄">貯蓄</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">口座番号（下4桁）</label>
              <Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="例: 1234" maxLength={4} aria-label="口座番号" />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={!form.bankName} aria-label="口座を追加">
                <Plus className="w-4 h-4 mr-1" />追加
              </Button>
            </div>
          </form>
        </Card>
      )}

      {bankAccounts.length === 0 && !showForm ? (
        <div className="mt-4 text-center py-8 text-slate-400 bg-blue-50/50 rounded-lg border border-dashed border-blue-200">
          <Building2 className="w-10 h-10 mx-auto mb-2 text-blue-300" />
          銀行口座が登録されていません。<br />
          <span className="text-sm">登録すると、固定費・変動費に振り分け先を指定できます。</span>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {bankAccounts.map((account) => (
            <BankAccountRow
              key={account.id}
              account={account}
              onUpdate={onUpdate}
              onDelete={handleDelete}
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default FixedCostSettings;
