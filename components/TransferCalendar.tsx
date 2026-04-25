import React, { useState } from 'react';
import { CalendarCheck, Plus, Trash2, CheckCircle2, Circle, FileText, X } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { Card, Button, Input, PageHeader, IconButton, useToast } from './UIComponents';
import { TransferRecord } from '../types';

const TransferCalendar: React.FC = () => {
  const { transferRecords, addTransferRecord, deleteTransferRecord, monthlyData, fixedCosts, getMonthlyData } = useFinance();
  const { showToast } = useToast();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState({ month: '', amount: 0, paidDate: '', note: '' });
  const [viewRecord, setViewRecord] = useState<TransferRecord | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${selectedYear}-${m}`;
  });

  const getRecordForMonth = (month: string) => transferRecords.find((r) => r.month === month);

  const getExpectedAmount = (month: string) => {
    const md = getMonthlyData(month);
    const totalFixed = fixedCosts.reduce((sum, c) => sum + c.amount, 0);
    const totalVariable = md.variableCosts.reduce((sum, c) => sum + c.amount, 0);
    return md.salary - totalFixed - totalVariable;
  };

  const handleAdd = () => {
    if (!newRecord.month || !newRecord.paidDate) return;
    // Prevent duplicate records for the same month
    if (transferRecords.some(r => r.month === newRecord.month)) return;
    const amount = newRecord.amount || getExpectedAmount(newRecord.month);
    addTransferRecord({ ...newRecord, amount });
    showToast(`${newRecord.month} の振込を記録しました`);
    setNewRecord({ month: '', amount: 0, paidDate: '', note: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const record = transferRecords.find(r => r.id === id);
    deleteTransferRecord(id);
    showToast(`${record?.month || ''} の振込記録を削除しました`);
  };

  const totalPaid = transferRecords
    .filter((r) => r.month.startsWith(String(selectedYear)))
    .reduce((sum, r) => sum + r.amount, 0);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<CalendarCheck className="w-6 h-6 text-rose-500" />}
        title="振込履歴カレンダー"
        description="パートナーへの振込履歴を管理します。"
      >
        <div className="flex gap-2 items-center">
          <Button variant="secondary" size="sm" onClick={() => setSelectedYear(selectedYear - 1)} aria-label="前の年">&larr;</Button>
          <span className="text-lg font-bold text-slate-700 min-w-[60px] text-center">{selectedYear}年</span>
          <Button variant="secondary" size="sm" onClick={() => setSelectedYear(selectedYear + 1)} aria-label="次の年">&rarr;</Button>
        </div>
      </PageHeader>

      {/* Summary */}
      <Card className="bg-gradient-to-br from-rose-600 to-rose-800 text-white border-none">
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck className="w-5 h-5" />
          <span className="text-sm font-medium text-white">{selectedYear}年 振込合計</span>
        </div>
        <div className="text-4xl font-bold tracking-tight">{formatCurrency(totalPaid)}</div>
        <p className="text-sm text-white mt-2">
          {transferRecords.filter(r => r.month.startsWith(String(selectedYear))).length} / 12 ヶ月支払済み
        </p>
      </Card>

      {/* Calendar Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {months.map((month, idx) => {
          const record = getRecordForMonth(month);
          const expected = getExpectedAmount(month);
          const isPast = month < new Date().toISOString().slice(0, 7);

          return (
            <Card
              key={month}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                record
                  ? 'bg-emerald-50 border-emerald-200'
                  : isPast
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-slate-200'
              }`}
              onClick={() => {
                if (record) {
                  setViewRecord(record);
                } else {
                  setNewRecord({
                    month,
                    amount: expected > 0 ? expected : 0,
                    paidDate: new Date().toISOString().slice(0, 10),
                    note: ''
                  });
                  setShowForm(true);
                }
              }}
            >
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700 mb-1">{monthNames[idx]}</p>
                {record ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                    <p className="text-xs font-bold text-emerald-700">{formatCurrency(record.amount)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{record.paidDate}</p>
                  </>
                ) : (
                  <>
                    <Circle className={`w-8 h-8 mx-auto mb-1 ${isPast ? 'text-red-300' : 'text-slate-300'}`} />
                    <p className="text-xs text-slate-400">
                      {expected > 0 ? formatCurrency(expected) : '未入力'}
                    </p>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* View Record Detail */}
      {viewRecord && (
        <Card color="emerald">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              {viewRecord.month} の振込記録
            </h3>
            <Button variant="secondary" size="sm" onClick={() => setViewRecord(null)} aria-label="閉じる">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500">振込金額</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(viewRecord.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">振込日</p>
              <p className="text-lg font-bold text-slate-800">{viewRecord.paidDate}</p>
            </div>
            {viewRecord.note && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500">メモ</p>
                <p className="text-sm text-slate-700">{viewRecord.note}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Add Record Form */}
      {showForm && (
        <Card color="rose">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-500" />
              振込記録
            </h3>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} aria-label="キャンセル">
              <span className="text-xs">キャンセル</span>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">対象月</label>
              <Input type="month" value={newRecord.month} onChange={(e) => setNewRecord({ ...newRecord, month: e.target.value })} aria-label="対象月" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">振込金額</label>
              <Input type="number" value={newRecord.amount || ''} onChange={(e) => setNewRecord({ ...newRecord, amount: Number(e.target.value) || 0 })} inputMode="numeric" aria-label="振込金額" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">振込日</label>
              <Input type="date" value={newRecord.paidDate} onChange={(e) => setNewRecord({ ...newRecord, paidDate: e.target.value })} aria-label="振込日" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">メモ</label>
              <Input value={newRecord.note} onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })} placeholder="オプション" aria-label="メモ" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleAdd} variant="primary" disabled={!newRecord.month || !newRecord.paidDate} aria-label="振込を記録">
              <Plus className="w-4 h-4 mr-1" />記録
            </Button>
          </div>
        </Card>
      )}

      {/* Records List */}
      {transferRecords.filter(r => r.month.startsWith(String(selectedYear))).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-3">振込一覧</h3>
          <div className="space-y-2">
            {transferRecords
              .filter(r => r.month.startsWith(String(selectedYear)))
              .sort((a, b) => a.month.localeCompare(b.month))
              .map((record) => (
                <Card key={record.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{record.month}</p>
                      <p className="text-xs text-slate-500">{record.paidDate} {record.note && `- ${record.note}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-800">{formatCurrency(record.amount)}</span>
                    <IconButton variant="danger" label="削除" onClick={() => handleDelete(record.id)}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferCalendar;
