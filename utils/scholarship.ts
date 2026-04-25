import { ScholarshipLoan } from '../types';

function monthDiff(startYM: string, endYM: string): number {
  const [sy, sm] = startYM.split('-').map(Number);
  const [ey, em] = endYM.split('-').map(Number);
  if (isNaN(sy) || isNaN(sm) || isNaN(ey) || isNaN(em)) return 0;
  return (ey - sy) * 12 + (em - sm);
}

function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y, m - 1 + months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function calculateRemainingBalance(loan: ScholarshipLoan, asOfMonth: string): number {
  const months = monthDiff(loan.repaymentStartMonth, asOfMonth);
  if (months < 0) return loan.totalBorrowed;
  if (loan.monthlyPayment <= 0) return loan.totalBorrowed;

  if (loan.type === 'type1' || loan.interestRate === 0) {
    const remaining = loan.totalBorrowed - months * loan.monthlyPayment;
    return Math.max(0, remaining);
  }

  const monthlyRate = loan.interestRate / 100 / 12;
  let balance = loan.totalBorrowed;
  for (let i = 0; i < months; i++) {
    if (balance <= 0) break;
    const interest = balance * monthlyRate;
    const principalPayment = loan.monthlyPayment - interest;
    if (principalPayment <= 0) return balance; // payment doesn't cover interest
    balance = Math.max(0, balance - principalPayment);
  }
  return balance;
}

export function calculatePayoffDate(loan: ScholarshipLoan): string {
  if (loan.monthlyPayment <= 0) return '返済不能';

  if (loan.type === 'type1' || loan.interestRate === 0) {
    const totalMonths = Math.ceil(loan.totalBorrowed / loan.monthlyPayment);
    return addMonths(loan.repaymentStartMonth, totalMonths);
  }

  const monthlyRate = loan.interestRate / 100 / 12;
  let balance = loan.totalBorrowed;
  let months = 0;
  const maxMonths = 600;

  while (balance > 0 && months < maxMonths) {
    const interest = balance * monthlyRate;
    if (loan.monthlyPayment <= interest) return '返済不能';
    const principalPayment = Math.min(loan.monthlyPayment - interest, balance);
    balance -= principalPayment;
    months++;
  }

  return addMonths(loan.repaymentStartMonth, months);
}

export function calculateProgress(loan: ScholarshipLoan, asOfMonth: string): number {
  const remaining = calculateRemainingBalance(loan, asOfMonth);
  if (loan.totalBorrowed <= 0) return 0;
  return Math.min(100, Math.max(0, ((loan.totalBorrowed - remaining) / loan.totalBorrowed) * 100));
}

export function calculateTotalInterest(loan: ScholarshipLoan): number {
  if (loan.type === 'type1' || loan.interestRate === 0) return 0;
  if (loan.monthlyPayment <= 0) return 0;

  const monthlyRate = loan.interestRate / 100 / 12;
  let balance = loan.totalBorrowed;
  let totalInterest = 0;
  const maxMonths = 600;

  for (let i = 0; i < maxMonths && balance > 0; i++) {
    const interest = balance * monthlyRate;
    if (loan.monthlyPayment <= interest) break;
    const principalPayment = Math.min(loan.monthlyPayment - interest, balance);
    totalInterest += balance > principalPayment ? interest : balance * monthlyRate;
    balance -= principalPayment;
  }

  return Math.round(totalInterest);
}
