import { CostItem, MonthlyData, ScholarshipLoan, ExpenseCategory, CATEGORY_COLORS, SCHOLARSHIP_CATEGORIES } from '../types';

interface SankeyNode {
  id: string;
  nodeColor?: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

function getCategoryLabel(category?: ExpenseCategory): ExpenseCategory {
  return category || 'その他';
}

export function buildSankeyData(
  salary: number,
  fixedCosts: CostItem[],
  variableCosts: CostItem[],
  scholarshipPayment: number = 0
): SankeyData {
  if (salary <= 0) return { nodes: [], links: [] };

  const categoryTotals = new Map<ExpenseCategory, number>();

  const isScholarshipCat = (cat?: string) => SCHOLARSHIP_CATEGORIES.includes(cat as any);

  // 通常の費目を集計（奨学金関連はサンキーの「奨学金関連」ノードにまとめる）
  let scholarshipTotal = scholarshipPayment; // トラッカーからの返済額
  for (const cost of [...fixedCosts, ...variableCosts]) {
    if (isScholarshipCat(cost.category)) {
      scholarshipTotal += cost.amount; // 奨学金返済積立もここに合算
    } else {
      const cat = getCategoryLabel(cost.category);
      categoryTotals.set(cat, (categoryTotals.get(cat) || 0) + cost.amount);
    }
  }

  if (scholarshipTotal > 0) {
    categoryTotals.set('奨学金', scholarshipTotal);
  }

  const nodes: SankeyNode[] = [{ id: '給料', nodeColor: '#6366f1' }];
  const links: SankeyLink[] = [];

  for (const [category, total] of categoryTotals) {
    if (total <= 0) continue;
    nodes.push({ id: category, nodeColor: CATEGORY_COLORS[category] });
    links.push({ source: '給料', target: category, value: total });
  }

  const totalExpenses = Array.from(categoryTotals.values()).reduce((a, b) => a + b, 0);
  const surplus = salary - totalExpenses;

  if (surplus > 0) {
    nodes.push({ id: '振込金額', nodeColor: '#10b981' });
    links.push({ source: '給料', target: '振込金額', value: surplus });
  }

  return { nodes, links };
}

export interface MonthlyBarItem {
  month: string;
  収入: number;
  支出: number;
  [key: string]: string | number;
}

export function buildMonthlyBarData(
  monthlyData: MonthlyData[],
  fixedCosts: CostItem[]
): MonthlyBarItem[] {
  const totalFixed = fixedCosts.reduce((sum, c) => sum + c.amount, 0);

  return [...monthlyData]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((md) => {
      const totalVariable = md.variableCosts.reduce((sum, c) => sum + c.amount, 0);
      return {
        month: md.month,
        収入: md.salary,
        支出: totalFixed + totalVariable,
      };
    });
}

export function buildCategoryBreakdown(
  fixedCosts: CostItem[],
  variableCosts: CostItem[]
): { category: ExpenseCategory; amount: number; color: string }[] {
  const totals = new Map<ExpenseCategory, number>();

  for (const cost of [...fixedCosts, ...variableCosts]) {
    const cat = getCategoryLabel(cost.category);
    totals.set(cat, (totals.get(cat) || 0) + cost.amount);
  }

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category],
    }))
    .sort((a, b) => b.amount - a.amount);
}
