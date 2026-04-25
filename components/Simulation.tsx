import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Sliders } from 'lucide-react';
import { ResponsiveBar } from '@nivo/bar';
import { useFinance } from '../contexts/FinanceContext';
import { simulateScholarshipRepayment, simulateSavingsGrowth } from '../utils/simulation';
import { formatCurrency } from '../utils/format';
import { Card, Input, PageHeader, Button } from './UIComponents';
import { CATEGORY_COLORS } from '../types';

const Simulation: React.FC = () => {
  const { scholarshipLoans, savingsGoals } = useFinance();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [simMonths, setSimMonths] = useState(60);
  const [tab, setTab] = useState<'loan' | 'savings'>(scholarshipLoans.length > 0 ? 'loan' : 'savings');

  // 奨学金シミュレーション
  const loanSim = useMemo(
    () => simulateScholarshipRepayment(scholarshipLoans, currentMonth, simMonths),
    [scholarshipLoans, currentMonth, simMonths]
  );

  // 貯金シミュレーション
  const savingsSim = useMemo(
    () => simulateSavingsGrowth(savingsGoals, currentMonth, simMonths),
    [savingsGoals, currentMonth, simMonths]
  );

  const loanKeys = scholarshipLoans.map(l => l.label);
  const savingsKeys = savingsGoals.map(g => g.name);

  // 完済予定を検出
  const payoffMonth = loanSim.length > 0 ? loanSim[loanSim.length - 1].month : null;
  const goalReachedMonth = savingsSim.length > 0 ? savingsSim[savingsSim.length - 1].month : null;

  const hasLoans = scholarshipLoans.length > 0;
  const hasSavings = savingsGoals.length > 0;

  if (!hasLoans && !hasSavings) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-24 md:pb-6">
        <PageHeader
          icon={<Sliders className="w-6 h-6 text-indigo-500" />}
          title="シミュレーション"
          description="返済と貯金の将来予測を確認できます。"
        />
        <Card>
          <div className="text-center py-12 text-slate-500">
            <Sliders className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>奨学金または貯金目標を登録するとシミュレーションが表示されます。</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<Sliders className="w-6 h-6 text-indigo-500" />}
        title="シミュレーション"
        description="返済と貯金の将来予測を確認できます。"
      >
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">期間</label>
          <select
            value={simMonths}
            onChange={(e) => setSimMonths(Number(e.target.value))}
            className="rounded-lg border-slate-300 shadow-sm py-2 px-3 bg-white text-slate-900 text-sm min-h-[44px]"
            style={{ colorScheme: 'light' }}
            aria-label="シミュレーション期間"
          >
            <option value={12}>1年</option>
            <option value={24}>2年</option>
            <option value={36}>3年</option>
            <option value={60}>5年</option>
            <option value={120}>10年</option>
            <option value={240}>20年</option>
          </select>
        </div>
      </PageHeader>

      {/* Tab Switcher */}
      {hasLoans && hasSavings && (
        <div className="flex gap-2">
          <Button
            variant={tab === 'loan' ? 'info' : 'secondary'}
            onClick={() => setTab('loan')}
            aria-label="奨学金返済シミュレーション"
          >
            <TrendingDown className="w-4 h-4 mr-1" />
            奨学金返済
          </Button>
          <Button
            variant={tab === 'savings' ? 'success' : 'secondary'}
            onClick={() => setTab('savings')}
            aria-label="貯金シミュレーション"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            貯金積立
          </Button>
        </div>
      )}

      {/* 奨学金返済シミュレーション */}
      {((tab === 'loan' && hasLoans) || (!hasSavings && hasLoans)) && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card color="teal">
              <p className="text-xs text-slate-500">現在の残高合計</p>
              <p className="text-xl font-bold text-teal-600">
                {formatCurrency(Number(loanSim[0]?.['合計'] ?? 0))}
              </p>
            </Card>
            {payoffMonth && (
              <Card color="teal">
                <p className="text-xs text-slate-500">完済予定</p>
                <p className="text-xl font-bold text-teal-600">{payoffMonth}</p>
              </Card>
            )}
            <Card color="teal">
              <p className="text-xs text-slate-500">月額返済合計</p>
              <p className="text-xl font-bold text-teal-600">
                {formatCurrency(scholarshipLoans.reduce((s, l) => s + l.monthlyPayment, 0))}
              </p>
            </Card>
          </div>

          {/* グラフ */}
          <Card>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">返済残高の推移</h3>
            {loanSim.length > 1 ? (
              <div className="h-[350px] md:h-[400px]">
                <ResponsiveBar
                  data={loanSim.filter((_, i) => {
                    // 間引き: データが多い場合は3ヶ月ごと
                    if (loanSim.length > 40) return i % 3 === 0 || i === loanSim.length - 1;
                    return true;
                  })}
                  keys={loanKeys}
                  indexBy="label"
                  margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
                  padding={0.3}
                  groupMode="stacked"
                  colors={[CATEGORY_COLORS['奨学金'], '#06b6d4']}
                  borderRadius={2}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    format: (v: string) => v.slice(2), // "26-04"
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    format: (v: number) => `${(v / 10000).toFixed(0)}万`,
                  }}
                  enableLabel={false}
                  tooltip={({ id, value, color }: Record<string, unknown>) => (
                    <div className="bg-white shadow-lg rounded-lg px-3 py-2 border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color as string }} />
                        <span className="text-sm font-medium text-slate-700">{String(id)}: {formatCurrency(value as number)}</span>
                      </div>
                    </div>
                  )}
                  theme={{
                    axis: { ticks: { text: { fill: '#64748b', fontSize: 11 } } },
                    grid: { line: { stroke: '#e2e8f0' } },
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">データが不足しています</p>
            )}
          </Card>

          {/* 月別テーブル（先頭と主要ポイント） */}
          <Card>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">返済スケジュール</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">月</th>
                    {loanKeys.map(k => (
                      <th key={k} className="text-right py-2 px-3 text-slate-500 font-medium">{k}</th>
                    ))}
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {loanSim
                    .filter((_, i) => i === 0 || i % 12 === 0 || i === loanSim.length - 1)
                    .map((point, idx) => (
                    <tr key={point.month} className={idx % 2 === 0 ? 'bg-slate-50/50' : ''}>
                      <td className="py-2 px-3 font-medium text-slate-700">{point.month}</td>
                      {loanKeys.map(k => (
                        <td key={k} className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(Number(point[k] ?? 0))}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-mono font-bold text-teal-600">
                        {formatCurrency(Number(point['合計'] ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* 貯金シミュレーション */}
      {((tab === 'savings' && hasSavings) || (!hasLoans && hasSavings)) && (
        <>
          {/* 月額積立が未設定の目標があれば案内 */}
          {savingsGoals.some(g => !g.monthlyContribution) && (
            <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg">
              「貯金目標トラッカー」で各目標の「月額積立額」を設定すると、より正確なシミュレーションになります。
            </div>
          )}

          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card color="emerald">
              <p className="text-xs text-slate-500">現在の貯金合計</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(savingsGoals.reduce((s, g) => s + g.currentAmount, 0))}
              </p>
            </Card>
            <Card color="emerald">
              <p className="text-xs text-slate-500">目標合計</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(savingsGoals.reduce((s, g) => s + g.targetAmount, 0))}
              </p>
            </Card>
            {goalReachedMonth && (
              <Card color="emerald">
                <p className="text-xs text-slate-500">全目標達成予定</p>
                <p className="text-xl font-bold text-emerald-600">{goalReachedMonth}</p>
              </Card>
            )}
          </div>

          {/* グラフ */}
          <Card>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">貯金推移の予測</h3>
            {savingsSim.length > 1 ? (
              <div className="h-[350px] md:h-[400px]">
                <ResponsiveBar
                  data={savingsSim.filter((_, i) => {
                    if (savingsSim.length > 40) return i % 3 === 0 || i === savingsSim.length - 1;
                    return true;
                  })}
                  keys={savingsKeys}
                  indexBy="label"
                  margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
                  padding={0.3}
                  groupMode="stacked"
                  colors={['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']}
                  borderRadius={2}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: -45,
                    format: (v: string) => v.slice(2),
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    format: (v: number) => `${(v / 10000).toFixed(0)}万`,
                  }}
                  enableLabel={false}
                  tooltip={({ id, value, color }: Record<string, unknown>) => (
                    <div className="bg-white shadow-lg rounded-lg px-3 py-2 border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color as string }} />
                        <span className="text-sm font-medium text-slate-700">{String(id)}: {formatCurrency(value as number)}</span>
                      </div>
                    </div>
                  )}
                  theme={{
                    axis: { ticks: { text: { fill: '#64748b', fontSize: 11 } } },
                    grid: { line: { stroke: '#e2e8f0' } },
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">月額積立額を設定するとグラフが表示されます</p>
            )}
          </Card>

          {/* 年次テーブル */}
          <Card>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">積立スケジュール</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-3 text-slate-500 font-medium">月</th>
                    {savingsKeys.map(k => (
                      <th key={k} className="text-right py-2 px-3 text-slate-500 font-medium">{k}</th>
                    ))}
                    <th className="text-right py-2 px-3 text-slate-500 font-medium">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {savingsSim
                    .filter((_, i) => i === 0 || i % 12 === 0 || i === savingsSim.length - 1)
                    .map((point, idx) => (
                    <tr key={point.month} className={idx % 2 === 0 ? 'bg-slate-50/50' : ''}>
                      <td className="py-2 px-3 font-medium text-slate-700">{point.month}</td>
                      {savingsKeys.map(k => (
                        <td key={k} className="py-2 px-3 text-right font-mono text-slate-600">
                          {formatCurrency(Number(point[k] ?? 0))}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(Number(point['合計'] ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default Simulation;
