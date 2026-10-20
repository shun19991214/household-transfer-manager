import { CostItem, MonthlyData, ScholarshipLoan, SavingsGoal, TransferRecord, BankAccount } from '../types';

// Shape stored under households/{householdId}.data in Firestore
// (identical to the JSON previously stored in Supabase finance_data.data).
export interface FinancePayload {
  fixedCosts: CostItem[];
  monthlyData: MonthlyData[];
  scholarshipLoans: ScholarshipLoan[];
  savingsGoals: SavingsGoal[];
  transferRecords: TransferRecord[];
  bankAccounts: BankAccount[];
  scholarshipReserveInitial: number;
  scholarshipReserveBonus: number;
  scholarshipReserveBonusMonths: number[];
}

// Firestore rejects documents over 1 MiB; leave headroom for metadata fields.
export const PAYLOAD_HARD_LIMIT_BYTES = 1_000_000;
export const PAYLOAD_WARN_BYTES = 800_000;

export const sanitizeBonusMonths = (months: unknown[]): number[] =>
  months.filter((m): m is number => Number.isInteger(m) && (m as number) >= 1 && (m as number) <= 12);

// Overlay valid fields from a remote payload onto the current one; invalid or missing fields keep local values.
export const mergeRemotePayload = (current: FinancePayload, remote: unknown): FinancePayload => {
  if (!remote || typeof remote !== 'object') return current;
  const d = remote as Record<string, unknown>;
  return {
    fixedCosts: Array.isArray(d.fixedCosts) ? (d.fixedCosts as CostItem[]) : current.fixedCosts,
    monthlyData: Array.isArray(d.monthlyData) ? (d.monthlyData as MonthlyData[]) : current.monthlyData,
    scholarshipLoans: Array.isArray(d.scholarshipLoans) ? (d.scholarshipLoans as ScholarshipLoan[]) : current.scholarshipLoans,
    savingsGoals: Array.isArray(d.savingsGoals) ? (d.savingsGoals as SavingsGoal[]) : current.savingsGoals,
    transferRecords: Array.isArray(d.transferRecords) ? (d.transferRecords as TransferRecord[]) : current.transferRecords,
    bankAccounts: Array.isArray(d.bankAccounts) ? (d.bankAccounts as BankAccount[]) : current.bankAccounts,
    scholarshipReserveInitial: typeof d.scholarshipReserveInitial === 'number' ? d.scholarshipReserveInitial : current.scholarshipReserveInitial,
    scholarshipReserveBonus: typeof d.scholarshipReserveBonus === 'number' ? d.scholarshipReserveBonus : current.scholarshipReserveBonus,
    scholarshipReserveBonusMonths: Array.isArray(d.scholarshipReserveBonusMonths)
      ? sanitizeBonusMonths(d.scholarshipReserveBonusMonths)
      : current.scholarshipReserveBonusMonths,
  };
};

// JSON with sorted object keys and undefined dropped, so payloads compare equal
// regardless of the key order Firestore returns maps in.
export const stableStringify = (value: unknown): string => {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map((item) => (item === undefined ? null : normalize(item)));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v as Record<string, unknown>).sort()) {
        const child = (v as Record<string, unknown>)[key];
        if (child !== undefined) out[key] = normalize(child);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(normalize(value));
};

export const byteLength = (s: string): number => new TextEncoder().encode(s).length;
