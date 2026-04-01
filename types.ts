export interface CostItem {
  id: string;
  name: string;
  amount: number;
}

export interface MonthlyData {
  id: string;
  month: string; // Format: YYYY-MM
  salary: number;
  variableCosts: CostItem[];
  isPaid?: boolean;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface FinanceContextType {
  fixedCosts: CostItem[];
  monthlyData: MonthlyData[];
  firebaseConfig: FirebaseConfig | null;
  isCloudEnabled: boolean;
  getMonthlyData: (month: string) => MonthlyData;
  addFixedCost: (name: string, amount: number) => void;
  updateFixedCost: (id: string, name: string, amount: number) => void;
  deleteFixedCost: (id: string) => void;
  updateMonthlySalary: (month: string, salary: number) => void;
  addVariableCost: (month: string, name: string, amount: number) => void;
  updateVariableCost: (month: string, costId: string, name: string, amount: number) => void;
  deleteVariableCost: (month: string, costId: string) => void;
  toggleMonthlyPaidStatus: (month: string, status: boolean) => void;
  syncFromCloud: () => Promise<void>;
}