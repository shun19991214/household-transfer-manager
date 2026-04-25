import { ScholarshipLoan, SavingsGoal, DEFAULT_BONUS_MONTHS } from '../types';

export interface SimulationPoint {
  month: string; // YYYY-MM
  label: string; // 表示用 (例: "2026-04")
  [key: string]: string | number;
}

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 奨学金返済シミュレーション: 月ごとの残高推移
// initialReserve: 開始時点での「奨学金返済積立」累計
// monthlyReserve: 毎月積み増される「奨学金返済積立」額
// bonusReserve: ボーナス月に追加で積み増す額
// bonusMonths: ボーナスを反映する月（1-12）
export function simulateScholarshipRepayment(
  loans: ScholarshipLoan[],
  fromMonth: string,
  months: number = 60,
  initialReserve: number = 0,
  monthlyReserve: number = 0,
  bonusReserve: number = 0,
  bonusMonths: number[] = []
): SimulationPoint[] {
  if (loans.length === 0) return [];

  const points: SimulationPoint[] = [];
  const bonusSet = new Set(bonusMonths);
  let bonusAccumulated = 0;

  for (let i = 0; i <= months; i++) {
    const month = addMonths(fromMonth, i);
    const point: SimulationPoint = { month, label: month };
    const monthOfYear = Number(month.split('-')[1]);
    if (i > 0 && bonusReserve > 0 && bonusSet.has(monthOfYear)) {
      bonusAccumulated += bonusReserve;
    }

    let totalRemaining = 0;

    for (const loan of loans) {
      const monthsDiff = monthDiffCalc(loan.repaymentStartMonth, month);
      let balance: number;

      if (monthsDiff < 0) {
        balance = loan.totalBorrowed;
      } else if (loan.type === 'type1' || loan.interestRate === 0) {
        balance = Math.max(0, loan.totalBorrowed - monthsDiff * loan.monthlyPayment);
      } else {
        const monthlyRate = loan.interestRate / 100 / 12;
        balance = loan.totalBorrowed;
        for (let j = 0; j < monthsDiff; j++) {
          if (balance <= 0) break;
          const interest = balance * monthlyRate;
          const principal = Math.min(loan.monthlyPayment - interest, balance);
          if (principal <= 0) break;
          balance -= principal;
        }
        balance = Math.max(0, balance);
      }

      point[loan.label] = Math.round(balance);
      totalRemaining += balance;
    }

    const reserveAccumulated = Math.min(
      totalRemaining,
      initialReserve + monthlyReserve * i + bonusAccumulated
    );
    const effectiveRemaining = Math.max(0, totalRemaining - reserveAccumulated);

    point['合計'] = Math.round(totalRemaining);
    point['積立累計'] = Math.round(reserveAccumulated);
    point['実質残高'] = Math.round(effectiveRemaining);
    points.push(point);

    // 実質残高がゼロ（積立で実質完済）になったら打ち切り
    if (effectiveRemaining <= 0) break;
  }

  return points;
}

// 貯金シミュレーション: 月ごとの積立推移
export function simulateSavingsGrowth(
  goals: SavingsGoal[],
  fromMonth: string,
  months: number = 60
): SimulationPoint[] {
  if (goals.length === 0) return [];

  const points: SimulationPoint[] = [];
  const bonusAccumulatedByGoal: Record<string, number> = {};

  for (let i = 0; i <= months; i++) {
    const month = addMonths(fromMonth, i);
    const point: SimulationPoint = { month, label: month };
    const monthOfYear = Number(month.split('-')[1]);

    let totalSaved = 0;

    for (const goal of goals) {
      const monthly = goal.monthlyContribution || 0;
      const bonus = goal.bonusContribution || 0;
      const bonusMonths = (goal.bonusMonths && goal.bonusMonths.length > 0)
        ? goal.bonusMonths
        : DEFAULT_BONUS_MONTHS;
      bonusAccumulatedByGoal[goal.id] = bonusAccumulatedByGoal[goal.id] || 0;
      if (i > 0 && bonus > 0 && bonusMonths.includes(monthOfYear)) {
        bonusAccumulatedByGoal[goal.id] += bonus;
      }
      const projected = Math.min(
        goal.targetAmount,
        goal.currentAmount + monthly * i + bonusAccumulatedByGoal[goal.id]
      );
      point[goal.name] = Math.round(projected);
      totalSaved += projected;
    }

    // 目標合計ライン
    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    point['合計'] = Math.round(totalSaved);
    point['目標'] = totalTarget;

    points.push(point);

    // 全目標達成なら打ち切り
    if (totalSaved >= totalTarget) break;
  }

  return points;
}

function monthDiffCalc(startYM: string, endYM: string): number {
  const [sy, sm] = startYM.split('-').map(Number);
  const [ey, em] = endYM.split('-').map(Number);
  if (isNaN(sy) || isNaN(sm) || isNaN(ey) || isNaN(em)) return 0;
  return (ey - sy) * 12 + (em - sm);
}
