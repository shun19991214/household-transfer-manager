import React, { useState } from 'react';
import { Plus, Trash2, Layers, Cloud, AlertCircle } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { Button, Card, Input } from './UIComponents';

const FixedCostSettings: React.FC = () => {
  const { 
    fixedCosts, 
    addFixedCost, 
    deleteFixedCost, 
    updateFixedCost,
    isCloudEnabled
  } = useFinance();
  
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const totalFixed = fixedCosts.reduce((sum, item) => sum + item.amount, 0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAmount) return;
    addFixedCost(newName, parseInt(newAmount, 10));
    setNewName('');
    setNewAmount('');
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-20">
      
      {/* Firebase Cloud Settings Section */}
      <section>
        <header className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Cloud className={`w-6 h-6 ${isCloudEnabled ? 'text-emerald-500' : 'text-slate-400'}`} />
            クラウド連携 (Google DB)
          </h2>
          <div className="flex gap-2">
            {isCloudEnabled ? (
               <span className="text-xs text-emerald-600 border border-emerald-200 px-2 py-1 rounded bg-emerald-50 font-medium">
                 接続中 (自動同期)
               </span>
            ) : (
              <span className="text-xs text-slate-400 border border-slate-200 px-2 py-1 rounded bg-white">
                未接続
              </span>
            )}
          </div>
        </header>
        
        {!isCloudEnabled && (
          <Card className="p-4 mb-6 bg-amber-50 border-amber-100">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-amber-800">クラウド設定が未完了です</h3>
                <p className="text-xs text-amber-700 mt-1">
                  プロジェクトルートの <code>firebaseConfig.ts</code> にFirebaseの設定情報を記述すると、データのクラウド保存・同期が有効になります。
                </p>
              </div>
            </div>
          </Card>
        )}
      </section>

      <hr className="border-slate-200" />

      {/* Fixed Costs Section */}
      <section>
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            固定費設定
          </h2>
          <p className="text-slate-500 mt-1">毎月必ず発生する支払い（家賃、積立など）を設定します。</p>
        </header>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">固定費合計</span>
            <span className="text-3xl font-bold text-indigo-600">{formatCurrency(totalFixed)}</span>
          </div>

          <div className="space-y-4">
            {fixedCosts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                固定費が登録されていません。<br/>下部のフォームから追加してください。
              </div>
            ) : (
              fixedCosts.map((item) => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <div className="flex-grow grid grid-cols-2 gap-3">
                    <Input
                      value={item.name}
                      onChange={(e) => updateFixedCost(item.id, e.target.value, item.amount)}
                      placeholder="項目名"
                    />
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
                      <Input
                        type="number"
                        className="pl-7"
                        value={item.amount}
                        onChange={(e) => updateFixedCost(item.id, item.name, parseInt(e.target.value, 10) || 0)}
                        placeholder="金額"
                      />
                    </div>
                  </div>
                  <Button variant="danger" onClick={() => deleteFixedCost(item.id)} className="p-2" title="削除">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-medium text-slate-900 mb-3">新規追加</h3>
            <form onSubmit={handleAdd} className="flex gap-3 items-end">
              <div className="flex-grow">
                <label className="block text-xs font-medium text-slate-500 mb-1">項目名</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: 家賃"
                />
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-medium text-slate-500 mb-1">金額</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">¥</span>
                  <Input
                    type="number"
                    className="pl-7"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button type="submit" disabled={!newName || !newAmount}>
                <Plus className="w-4 h-4 mr-1" />
                追加
              </Button>
            </form>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default FixedCostSettings;