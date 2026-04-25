export const EXPENSE_CATEGORIES = [
  '家賃', '食費', '光熱費', '通信費', '交通費', '保険',
  '奨学金', '奨学金返済積立', '貯金',
  'サブスク', '日用品', '医療費',
  '交際費', '娯楽', '旅行', '被服費', '美容',
  '税金', '立替金', 'その他'
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

// 奨学金関連カテゴリ（振込額計算で奨学金セクションにまとめる）
export const SCHOLARSHIP_CATEGORIES: ExpenseCategory[] = ['奨学金', '奨学金返済積立'];

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  '家賃': '#6366f1',
  '食費': '#f59e0b',
  '光熱費': '#ef4444',
  '通信費': '#3b82f6',
  '交通費': '#8b5cf6',
  '保険': '#06b6d4',
  '奨学金': '#14b8a6',
  '奨学金返済積立': '#0d9488',
  '貯金': '#10b981',
  'サブスク': '#f97316',
  '日用品': '#ec4899',
  '医療費': '#64748b',
  '交際費': '#a855f7',
  '娯楽': '#eab308',
  '旅行': '#0ea5e9',
  '被服費': '#d946ef',
  '美容': '#f43f5e',
  '税金': '#78716c',
  '立替金': '#84cc16',
  'その他': '#94a3b8',
};

export interface BankAccount {
  id: string;
  name: string;        // 例: "三井住友銀行 普通"
  bankName: string;    // 例: "三井住友銀行"
  branchName?: string; // 例: "渋谷支店"
  accountType?: '普通' | '当座' | '貯蓄';
  accountNumber?: string; // 下4桁など
  color?: string;      // 表示色
}

export interface CostItem {
  id: string;
  name: string;
  amount: number;
  category?: ExpenseCategory;
  date?: string;       // 計上日 YYYY-MM-DD（変動費用、デフォルトは入力日）
  bankAccountId?: string; // 振り分け先の銀行口座ID
}

export interface MonthlyData {
  id: string;
  month: string; // Format: YYYY-MM
  salary: number;
  variableCosts: CostItem[];
  isPaid?: boolean;
}

export interface ScholarshipLoan {
  id: string;
  type: 'type1' | 'type2';
  label: string;
  totalBorrowed: number;
  monthlyPayment: number;
  interestRate: number;
  repaymentStartMonth: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlyContribution?: number;
  bonusContribution?: number;      // ボーナス1回あたりの追加積立額
  bonusMonths?: number[];           // ボーナス月（1-12）。未指定なら [6, 12]
}

export const DEFAULT_BONUS_MONTHS: number[] = [6, 12];

export interface TransferRecord {
  id: string;
  month: string;
  amount: number;
  paidDate: string;
  note?: string;
}

export interface FinanceContextType {
  fixedCosts: CostItem[];
  monthlyData: MonthlyData[];
  scholarshipLoans: ScholarshipLoan[];
  savingsGoals: SavingsGoal[];
  transferRecords: TransferRecord[];
  bankAccounts: BankAccount[];
  scholarshipReserveInitial: number;
  setScholarshipReserveInitial: (amount: number) => void;
  scholarshipReserveBonus: number;
  setScholarshipReserveBonus: (amount: number) => void;
  scholarshipReserveBonusMonths: number[];
  setScholarshipReserveBonusMonths: (months: number[]) => void;
  isCloudEnabled: boolean;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
  isLoaded: boolean;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  getMonthlyData: (month: string) => MonthlyData;
  addFixedCost: (name: string, amount: number, category?: ExpenseCategory, bankAccountId?: string) => void;
  updateFixedCost: (id: string, name: string, amount: number, category?: ExpenseCategory, bankAccountId?: string) => void;
  deleteFixedCost: (id: string) => void;
  updateMonthlySalary: (month: string, salary: number) => void;
  addVariableCost: (month: string, name: string, amount: number, category?: ExpenseCategory, date?: string) => void;
  updateVariableCost: (month: string, costId: string, name: string, amount: number, category?: ExpenseCategory, date?: string) => void;
  deleteVariableCost: (month: string, costId: string) => void;
  toggleMonthlyPaidStatus: (month: string, status: boolean) => void;
  addScholarshipLoan: (loan: Omit<ScholarshipLoan, 'id'>) => void;
  updateScholarshipLoan: (id: string, updates: Partial<ScholarshipLoan>) => void;
  deleteScholarshipLoan: (id: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteSavingsGoal: (id: string) => void;
  addTransferRecord: (record: Omit<TransferRecord, 'id'>) => void;
  updateTransferRecord: (id: string, updates: Partial<TransferRecord>) => void;
  deleteTransferRecord: (id: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  syncFromCloud: () => Promise<void>;
}
