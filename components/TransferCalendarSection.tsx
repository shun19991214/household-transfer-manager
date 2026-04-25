import React, { useState } from 'react';
import { CalendarCheck, Plus, Trash2, CheckCircle2, Circle, FileText, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency } from '../utils/format';
import { Card, Button, Input, IconButton, useToast } from './UIComponents';
import { TransferRecord } from '../types';

const TransferCalendarSection: React.FC = () => {
  const { transferRecords, addTransferRecord, deleteTransferRecord, fixedCosts, getMonthlyData } = useFinance();
  const { showToast } = useToast();
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [newRecord, setNewRecord] = useState({ month: '', amount: 0, paidDate: '', note: '' });
  const [viewRecord, setViewRecord] = useState<TransferRecord | null>(null);
  const [expanded, setExpanded] = useState(false);

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
    setViewRecord(null);
  };

  const totalPaid = transferRecords
    .filter((r) => r.month.startsWith(String(selectedYear)))
    .reduce((sum, r) => sum + r.amount, 0);
  const paidCount = transferRecords.filter(r => r.month.startsWith(String(selectedYear))).length;

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="space-y-4">
      {/* Section header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2 text-left"
        aria-expanded={expanded}
        aria-label="振込カレンダーを展開"
      >
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-rose-500" />
          振込カレンダー
          <span className="text-sm font-normal text-slate-400">
            {paidCount}/12 支払済 ・ {formatCurrency(totalPaid)}
          </span>
        </h3>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <>
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedYear(selectedYear - 1)} aria-label="前の年">&larr;</Button>
            <span className="text-sm font-bold text-slate-700 min-w-[50px] text-center">{selectedYear}年</span>
            <Button variant="secondary" size="sm" onClick={() => setSelectedYear(selectedYear + 1)} aria-label="次の年">&rarr;</Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {months.map((month, idx) => {
              const record = getRecordForMonth(month);
              const expected = getExpectedAmount(month);
              const isPast = month < new Date().toISOString().slice(0, 7);

              return (
                <div
                  key={month}
                  className={`rounded-lg border p-2 text-center cursor-pointer transition-all hover:shadow-sm ${
                    record
                      ? 'bg-emerald-50 border-emerald-200'
                      : isPast
                      ? 'bg-red-50 border-red-200'
                      : 'bg-white border-slate-200'
                  }`}
                  onClick={() => {
                    if (record) {
                      setViewRecord(viewRecord?.id === record.id ? null : record);
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
                  role="button"
                  tabIndex={0}
                  aria-label={`${monthNames[idx]} ${record ? '支払済' : isPast ? '未払い' : '未来'}`}
                >
                  <p className="text-xs font-bold text-slate-700">{monthNames[idx]}</p>
                  {record ? (
                    <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500 my-0.5" />
                  ) : (
                    <Circle className={`w-5 h-5 mx-auto my-0.5 ${isPast ? 'text-red-300' : 'text-slate-300'}`} />
                  )}
                  <p className="text-[11px] text-slate-500 truncate">
                    {record ? formatCurrency(record.amount) : expected > 0 ? formatCurrency(expected) : '-'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* View Record Detail */}
          {viewRecord && (
            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-800">{viewRecord.month} の記録</span>
                <div className="flex gap-1">
                  <IconButton variant="danger" label="削除" onClick={() => handleDelete(viewRecord.id)}>
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                  <Button variant="secondary" size="sm" onClick={() => setViewRecord(null)} aria-label="閉じる">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-slate-500">金額</p>
                  <p className="font-bold">{formatCurrency(viewRecord.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">振込日</p>
                  <p className="font-bold">{viewRecord.paidDate}</p>
                </div>
                {viewRecord.note && (
                  <div>
                    <p className="text-xs text-slate-500">メモ</p>
                    <p>{viewRecord.note}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Record Form */}
          {showForm && (
            <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  <FileText className="w-4 h-4 text-rose-500" /> 振込記録
                </span>
                <Button variant="secondary" size="sm" onClick={() => setShowForm(false)} aria-label="キャンセル">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Input type="month" value={newRecord.month} onChange={(e) => setNewRecord({ ...newRecord, month: e.target.value })} aria-label="対象月" />
                <Input type="number" value={newRecord.amount || ''} onChange={(e) => setNewRecord({ ...newRecord, amount: Number(e.target.value) || 0 })} placeholder="金額" inputMode="numeric" aria-label="振込金額" />
                <Input type="date" value={newRecord.paidDate} onChange={(e) => setNewRecord({ ...newRecord, paidDate: e.target.value })} aria-label="振込日" />
                <Input value={newRecord.note} onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })} placeholder="メモ" aria-label="メモ" />
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={handleAdd} variant="primary" size="sm" disabled={!newRecord.month || !newRecord.paidDate} aria-label="振込を記録">
                  <Plus className="w-4 h-4 mr-1" />記録
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TransferCalendarSection;
