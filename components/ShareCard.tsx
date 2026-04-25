import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Share2, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { ExpenseCategory } from '../types';

export interface ShareCardData {
  month: string;
  salary: number;
  paymentAmount: number;
  totalExpenses: number;
  totalFixed: number;
  totalScholarshipSection: number;
  totalVariable: number;
  fixedItems: Array<{ id: string; name: string; amount: number; category?: ExpenseCategory }>;
  scholarshipItems: Array<{ id: string; name: string; amount: number; category?: ExpenseCategory; auto?: boolean }>;
  variableItems: Array<{ id: string; name: string; amount: number; category?: ExpenseCategory }>;
  isPaid?: boolean;
}

interface Props {
  data: ShareCardData;
  open: boolean;
  onClose: () => void;
}

const Row: React.FC<{ label: string; amount: number; sign?: '+' | '-' }> = ({ label, amount, sign = '-' }) => (
  <div className="flex justify-between items-center px-3 py-1.5 text-xs">
    <span className="text-slate-600">{label}</span>
    <span className="font-mono text-slate-800">{sign} {formatCurrency(amount)}</span>
  </div>
);

const ShareCard: React.FC<Props> = ({ data, open, onClose }) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<'idle' | 'sharing' | 'downloading'>('idle');
  const [error, setError] = useState<string | null>(null);
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare;

  // ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const generatePng = async (): Promise<Blob> => {
    if (!captureRef.current) throw new Error('capture target not found');
    const dataUrl = await toPng(captureRef.current, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const fileName = `transfer-${data.month}.png`;

  const handleShare = async () => {
    setError(null);
    setBusy('sharing');
    try {
      const blob = await generatePng();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${data.month} の振込金額`,
          text: `${data.month} の振込金額: ${formatCurrency(data.paymentAmount)}`,
        });
      } else {
        // fallback: ダウンロード
        triggerDownload(blob);
      }
    } catch (e: any) {
      // ユーザーキャンセルは無視
      if (e?.name !== 'AbortError') {
        setError(e?.message || 'シェアに失敗しました');
      }
    } finally {
      setBusy('idle');
    }
  };

  const handleDownload = async () => {
    setError(null);
    setBusy('downloading');
    try {
      const blob = await generatePng();
      triggerDownload(blob);
    } catch (e: any) {
      setError(e?.message || 'ダウンロードに失敗しました');
    } finally {
      setBusy('idle');
    }
  };

  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="振込金額をシェア"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-500" /> 画像でシェア
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Captured area */}
        <div className="p-4 bg-slate-50">
          <div
            ref={captureRef}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            style={{ width: 420 }}
          >
            {/* Hero: payment amount */}
            <div
              className={`px-5 py-5 text-white ${
                data.paymentAmount < 0
                  ? 'bg-gradient-to-br from-red-500 to-red-700'
                  : data.isPaid
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-700'
                    : 'bg-gradient-to-br from-indigo-500 to-indigo-700'
              }`}
            >
              <p className="text-xs opacity-90">{data.month} の振込金額</p>
              <p className="text-4xl font-bold tracking-tight mt-1">
                {formatCurrency(data.paymentAmount)}
              </p>
              <p className="text-[11px] opacity-90 mt-2">
                給料 {formatCurrency(data.salary)} − 経費計 {formatCurrency(data.totalExpenses)}
              </p>
            </div>

            {/* Section totals */}
            <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 text-center">
              <div className="py-2">
                <p className="text-[10px] text-slate-500">固定費</p>
                <p className="text-xs font-bold text-slate-800">{formatCurrency(data.totalFixed)}</p>
              </div>
              <div className="py-2">
                <p className="text-[10px] text-slate-500">奨学金関連</p>
                <p className="text-xs font-bold text-slate-800">{formatCurrency(data.totalScholarshipSection)}</p>
              </div>
              <div className="py-2">
                <p className="text-[10px] text-slate-500">変動費</p>
                <p className="text-xs font-bold text-slate-800">{formatCurrency(data.totalVariable)}</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="divide-y divide-slate-100">
              {/* Fixed */}
              {data.fixedItems.length > 0 && (
                <div>
                  <div className="bg-violet-50/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 flex justify-between">
                    <span>固定費</span>
                    <span>− {formatCurrency(data.totalFixed)}</span>
                  </div>
                  {data.fixedItems.map((it) => (
                    <Row key={it.id} label={it.name} amount={it.amount} />
                  ))}
                </div>
              )}

              {/* Scholarship */}
              {data.scholarshipItems.length > 0 && (
                <div>
                  <div className="bg-teal-50/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 flex justify-between">
                    <span>奨学金関連</span>
                    <span>− {formatCurrency(data.totalScholarshipSection)}</span>
                  </div>
                  {data.scholarshipItems.map((it) => (
                    <Row key={it.id} label={it.name + (it.auto ? '（自動）' : '')} amount={it.amount} />
                  ))}
                </div>
              )}

              {/* Variable */}
              {data.variableItems.length > 0 && (
                <div>
                  <div className="bg-amber-50/60 px-3 py-1.5 text-[11px] font-semibold text-slate-700 flex justify-between">
                    <span>変動費</span>
                    <span>− {formatCurrency(data.totalVariable)}</span>
                  </div>
                  {data.variableItems.map((it) => (
                    <Row key={it.id} label={it.name || '（名称未設定）'} amount={it.amount} />
                  ))}
                </div>
              )}

              {data.fixedItems.length === 0 &&
                data.scholarshipItems.length === 0 &&
                data.variableItems.length === 0 && (
                  <div className="px-3 py-3 text-center text-xs text-slate-400">内訳なし</div>
                )}
            </div>

            <div className="px-3 py-2 text-[10px] text-slate-400 text-center border-t border-slate-100">
              おうちのかけいぼ
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="px-4 py-3 border-t border-slate-200 flex gap-2 flex-wrap">
          {canShare && (
            <button
              onClick={handleShare}
              disabled={busy !== 'idle'}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium min-h-[44px]"
            >
              {busy === 'sharing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              シェア
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={busy !== 'idle'}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-sm font-medium min-h-[44px]"
          >
            {busy === 'downloading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            ダウンロード
          </button>
        </div>
        {error && (
          <p className="px-4 pb-3 text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
};

export default ShareCard;
