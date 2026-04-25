import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ResponsiveSankey } from '@nivo/sankey';
import { ResponsiveBar } from '@nivo/bar';
import { useFinance } from '../contexts/FinanceContext';
import { buildSankeyData, buildMonthlyBarData, buildCategoryBreakdown } from '../utils/chartData';
import { formatCurrency } from '../utils/format';
import { calculateRemainingBalance } from '../utils/scholarship';
import { Card, Input, PageHeader } from './UIComponents';
import { CATEGORY_COLORS } from '../types';

const ExpenseCharts: React.FC = () => {
  const { selectedMonth, setSelectedMonth, fixedCosts, monthlyData, getMonthlyData, scholarshipLoans } = useFinance();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentData = getMonthlyData(selectedMonth);

  const totalScholarshipPayment = useMemo(
    () => scholarshipLoans
      .filter(loan => calculateRemainingBalance(loan, selectedMonth) > 0)
      .reduce((sum, loan) => sum + loan.monthlyPayment, 0),
    [scholarshipLoans, selectedMonth]
  );

  const sankeyData = useMemo(
    () => buildSankeyData(currentData.salary, fixedCosts, currentData.variableCosts, totalScholarshipPayment),
    [currentData.salary, fixedCosts, currentData.variableCosts, totalScholarshipPayment]
  );

  const barData = useMemo(
    () => buildMonthlyBarData(monthlyData, fixedCosts),
    [monthlyData, fixedCosts]
  );

  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(fixedCosts, currentData.variableCosts),
    [fixedCosts, currentData.variableCosts]
  );

  const totalExpenses = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <PageHeader
        icon={<BarChart3 className="w-6 h-6 text-indigo-500" />}
        title="支出グラフ"
        description="収支の流れと推移を可視化します。"
      >
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border-indigo-200 focus:border-indigo-500"
          aria-label="対象月を選択"
        />
      </PageHeader>

      {/* Sankey Diagram */}
      <Card>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">お金の流れ（サンキーダイアグラム）</h3>
        {sankeyData.nodes.length > 0 ? (
          <div className="h-[400px] md:h-[500px]">
            <ResponsiveSankey
              data={sankeyData}
              margin={{ top: 20, right: isMobile ? 80 : 160, bottom: 20, left: 20 }}
              align="justify"
              colors={(node: Record<string, unknown>) => (node.nodeColor as string) || '#6366f1'}
              nodeOpacity={1}
              nodeHoverOthersOpacity={0.35}
              nodeThickness={18}
              nodeSpacing={24}
              nodeBorderWidth={0}
              nodeBorderRadius={3}
              linkOpacity={0.4}
              linkHoverOthersOpacity={0.1}
              linkContract={3}
              enableLinkGradient={true}
              labelPosition="outside"
              labelOrientation="horizontal"
              labelPadding={16}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
              label={(node: Record<string, unknown>) => `${node.id} (${formatCurrency((node.value as number) || 0)})`}
            />
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>給料と支出を入力するとグラフが表示されます。</p>
              <Link to="/input" className="text-indigo-500 hover:text-indigo-600 underline text-sm mt-2 inline-block" aria-label="月次入力ページへ">
                月次データ入力へ
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">カテゴリ別支出</h3>
          <div className="space-y-3">
            {categoryBreakdown.map(({ category, amount, color }) => {
              const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-slate-700 w-20 flex-shrink-0">{category}</span>
                  <div className="flex-grow">
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-mono text-slate-800 w-24 text-right flex-shrink-0">{formatCurrency(amount)}</span>
                  <span className="text-xs text-slate-500 w-12 text-right flex-shrink-0">{percentage.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Monthly Trend Bar Chart */}
      {barData.length > 1 && (
        <Card>
          <h3 className="text-lg font-semibold text-slate-800 mb-4">月別収支推移</h3>
          <div className="h-[350px]">
            <ResponsiveBar
              data={barData}
              keys={['収入', '支出']}
              indexBy="month"
              margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
              padding={0.3}
              groupMode="grouped"
              colors={['#6366f1', '#f97316']}
              borderRadius={4}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                format: (v: string) => v.slice(5),
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                format: (v: number) => `${(v / 10000).toFixed(0)}万`,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
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
                axis: {
                  ticks: { text: { fill: '#64748b', fontSize: 11 } },
                },
                grid: { line: { stroke: '#e2e8f0' } },
              }}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default ExpenseCharts;
