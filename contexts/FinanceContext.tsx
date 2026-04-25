import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CostItem, MonthlyData, ScholarshipLoan, SavingsGoal, TransferRecord, BankAccount, FinanceContextType, ExpenseCategory, DEFAULT_BONUS_MONTHS } from '../types';
import { generateId } from '../utils/format';
import { supabaseConfig } from '../supabaseConfig';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY_FIXED = 'finance_app_fixed_costs';
const STORAGE_KEY_MONTHLY = 'finance_app_monthly_data';
const STORAGE_KEY_SCHOLARSHIPS = 'finance_app_scholarship_loans';
const STORAGE_KEY_SAVINGS = 'finance_app_savings_goals';
const STORAGE_KEY_TRANSFERS = 'finance_app_transfer_records';
const STORAGE_KEY_BANKS = 'finance_app_bank_accounts';
const STORAGE_KEY_RESERVE_INITIAL = 'finance_app_scholarship_reserve_initial';
const STORAGE_KEY_RESERVE_BONUS = 'finance_app_scholarship_reserve_bonus';
const STORAGE_KEY_RESERVE_BONUS_MONTHS = 'finance_app_scholarship_reserve_bonus_months';

const DOC_ID = 'main';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fixedCosts, setFixedCosts] = useState<CostItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [scholarshipLoans, setScholarshipLoans] = useState<ScholarshipLoan[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [scholarshipReserveInitial, setScholarshipReserveInitialState] = useState<number>(0);
  const [scholarshipReserveBonus, setScholarshipReserveBonusState] = useState<number>(0);
  const [scholarshipReserveBonusMonths, setScholarshipReserveBonusMonthsState] = useState<number[]>(DEFAULT_BONUS_MONTHS);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonthRaw] = useState(defaultMonth);

  // Guard against empty string month values from cleared inputs
  const setSelectedMonth = useCallback((month: string) => {
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      setSelectedMonthRaw(month);
    }
  }, []);

  // Load from LocalStorage on mount and initialize Supabase
  useEffect(() => {
    try {
      const storedFixed = localStorage.getItem(STORAGE_KEY_FIXED);
      const storedMonthly = localStorage.getItem(STORAGE_KEY_MONTHLY);
      const storedScholarships = localStorage.getItem(STORAGE_KEY_SCHOLARSHIPS);
      const storedSavings = localStorage.getItem(STORAGE_KEY_SAVINGS);
      const storedTransfers = localStorage.getItem(STORAGE_KEY_TRANSFERS);
      const storedBanks = localStorage.getItem(STORAGE_KEY_BANKS);
      const storedReserveInitial = localStorage.getItem(STORAGE_KEY_RESERVE_INITIAL);
      const storedReserveBonus = localStorage.getItem(STORAGE_KEY_RESERVE_BONUS);
      const storedReserveBonusMonths = localStorage.getItem(STORAGE_KEY_RESERVE_BONUS_MONTHS);

      if (storedFixed) setFixedCosts(JSON.parse(storedFixed));
      if (storedMonthly) setMonthlyData(JSON.parse(storedMonthly));
      if (storedScholarships) setScholarshipLoans(JSON.parse(storedScholarships));
      if (storedSavings) setSavingsGoals(JSON.parse(storedSavings));
      if (storedTransfers) setTransferRecords(JSON.parse(storedTransfers));
      if (storedBanks) setBankAccounts(JSON.parse(storedBanks));
      if (storedReserveInitial) setScholarshipReserveInitialState(Number(JSON.parse(storedReserveInitial)) || 0);
      if (storedReserveBonus) setScholarshipReserveBonusState(Number(JSON.parse(storedReserveBonus)) || 0);
      if (storedReserveBonusMonths) {
        const arr = JSON.parse(storedReserveBonusMonths);
        if (Array.isArray(arr)) setScholarshipReserveBonusMonthsState(arr.filter((m: any) => Number.isInteger(m) && m >= 1 && m <= 12));
      }

      if (supabaseConfig.url && supabaseConfig.anonKey) {
        const client = createClient(supabaseConfig.url, supabaseConfig.anonKey);
        setSupabase(client);
      }
    } catch (error) {
      console.error("Failed to load data from storage", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_FIXED, JSON.stringify(fixedCosts)); }, [fixedCosts, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_MONTHLY, JSON.stringify(monthlyData)); }, [monthlyData, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_SCHOLARSHIPS, JSON.stringify(scholarshipLoans)); }, [scholarshipLoans, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_SAVINGS, JSON.stringify(savingsGoals)); }, [savingsGoals, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_TRANSFERS, JSON.stringify(transferRecords)); }, [transferRecords, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(bankAccounts)); }, [bankAccounts, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_RESERVE_INITIAL, JSON.stringify(scholarshipReserveInitial)); }, [scholarshipReserveInitial, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_RESERVE_BONUS, JSON.stringify(scholarshipReserveBonus)); }, [scholarshipReserveBonus, isLoaded]);
  useEffect(() => { if (isLoaded) localStorage.setItem(STORAGE_KEY_RESERVE_BONUS_MONTHS, JSON.stringify(scholarshipReserveBonusMonths)); }, [scholarshipReserveBonusMonths, isLoaded]);

  // Cloud sync
  const syncFromCloud = useCallback(async () => {
    if (!supabase) throw new Error("クラウド未接続です。supabaseConfig.ts を設定してください。");
    try {
      const { data, error } = await supabase
        .from('finance_data')
        .select('data')
        .eq('id', DOC_ID)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.data) {
        const d = data.data;
        if (d.fixedCosts) setFixedCosts(d.fixedCosts);
        if (d.monthlyData) setMonthlyData(d.monthlyData);
        if (d.scholarshipLoans) setScholarshipLoans(d.scholarshipLoans);
        if (d.savingsGoals) setSavingsGoals(d.savingsGoals);
        if (d.transferRecords) setTransferRecords(d.transferRecords);
        if (d.bankAccounts) setBankAccounts(d.bankAccounts);
        if (typeof d.scholarshipReserveInitial === 'number') {
          setScholarshipReserveInitialState(d.scholarshipReserveInitial);
        }
        if (typeof d.scholarshipReserveBonus === 'number') {
          setScholarshipReserveBonusState(d.scholarshipReserveBonus);
        }
        if (Array.isArray(d.scholarshipReserveBonusMonths)) {
          setScholarshipReserveBonusMonthsState(
            d.scholarshipReserveBonusMonths.filter((m: any) => Number.isInteger(m) && m >= 1 && m <= 12)
          );
        }
      }
    } catch (error) {
      console.error("Error fetching from Supabase", error);
      throw error;
    }
  }, [supabase]);

  // Auto-fetch on Supabase connection
  useEffect(() => {
    if (!supabase) return;
    const fetchInitialData = async () => {
      try { await syncFromCloud(); } catch (error) { console.error("Initial cloud sync failed:", error); } finally { setIsCloudSynced(true); }
    };
    fetchInitialData();
  }, [supabase, syncFromCloud]);

  // Auto-save to Supabase (debounced)
  useEffect(() => {
    if (!supabase || !isLoaded || !isCloudSynced) return;
    setSyncStatus('saving');
    const saveData = async () => {
      try {
        const { error } = await supabase
          .from('finance_data')
          .upsert({
            id: DOC_ID,
            data: { fixedCosts, monthlyData, scholarshipLoans, savingsGoals, transferRecords, bankAccounts, scholarshipReserveInitial, scholarshipReserveBonus, scholarshipReserveBonusMonths },
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
        setSyncStatus('saved');
      } catch (error) {
        console.error("Error writing to Supabase", error);
        setSyncStatus('error');
      }
    };
    const timeoutId = setTimeout(saveData, 1000);
    return () => clearTimeout(timeoutId);
  }, [fixedCosts, monthlyData, scholarshipLoans, savingsGoals, transferRecords, bankAccounts, scholarshipReserveInitial, scholarshipReserveBonus, scholarshipReserveBonusMonths, supabase, isLoaded, isCloudSynced]);

  const setScholarshipReserveInitial = useCallback((amount: number) => {
    setScholarshipReserveInitialState(Math.max(0, Math.round(amount) || 0));
  }, []);
  const setScholarshipReserveBonus = useCallback((amount: number) => {
    setScholarshipReserveBonusState(Math.max(0, Math.round(amount) || 0));
  }, []);
  const setScholarshipReserveBonusMonths = useCallback((months: number[]) => {
    const cleaned = Array.from(new Set(months.filter(m => Number.isInteger(m) && m >= 1 && m <= 12))).sort((a, b) => a - b);
    setScholarshipReserveBonusMonthsState(cleaned);
  }, []);

  // Monthly data helper - stable ID for empty months
  const getMonthlyData = useCallback((month: string): MonthlyData => {
    const found = monthlyData.find((d) => d.month === month);
    if (found) return found;
    return { id: `temp-${month}`, month, salary: 0, variableCosts: [], isPaid: false };
  }, [monthlyData]);

  const upsertMonthlyData = useCallback((newData: MonthlyData) => {
    setMonthlyData((prev) => {
      const exists = prev.some((d) => d.month === newData.month);
      if (exists) return prev.map((d) => (d.month === newData.month ? newData : d));
      // Assign a real ID when persisting
      const data = newData.id.startsWith('temp-') ? { ...newData, id: generateId() } : newData;
      return [...prev, data];
    });
  }, []);

  // Fixed Costs
  const addFixedCost = useCallback((name: string, amount: number, category?: ExpenseCategory, bankAccountId?: string) => {
    setFixedCosts((prev) => [...prev, { id: generateId(), name, amount, category, bankAccountId }]);
  }, []);
  const updateFixedCost = useCallback((id: string, name: string, amount: number, category?: ExpenseCategory, bankAccountId?: string) => {
    setFixedCosts((prev) => prev.map((item) => (item.id === id ? { ...item, name, amount, category, ...(bankAccountId !== undefined ? { bankAccountId } : {}) } : item)));
  }, []);
  const deleteFixedCost = useCallback((id: string) => {
    setFixedCosts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Monthly Data
  const updateMonthlySalary = useCallback((month: string, salary: number) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({ ...current, salary });
  }, [getMonthlyData, upsertMonthlyData]);

  const addVariableCost = useCallback((month: string, name: string, amount: number, category?: ExpenseCategory, date?: string) => {
    const current = getMonthlyData(month);
    const today = date || new Date().toISOString().slice(0, 10);
    upsertMonthlyData({ ...current, variableCosts: [...current.variableCosts, { id: generateId(), name, amount, category, date: today }] });
  }, [getMonthlyData, upsertMonthlyData]);

  const updateVariableCost = useCallback((month: string, costId: string, name: string, amount: number, category?: ExpenseCategory, date?: string) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({ ...current, variableCosts: current.variableCosts.map(c => c.id === costId ? { ...c, name, amount, category, ...(date !== undefined ? { date } : {}) } : c) });
  }, [getMonthlyData, upsertMonthlyData]);

  const deleteVariableCost = useCallback((month: string, costId: string) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({ ...current, variableCosts: current.variableCosts.filter(c => c.id !== costId) });
  }, [getMonthlyData, upsertMonthlyData]);

  const toggleMonthlyPaidStatus = useCallback((month: string, status: boolean) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({ ...current, isPaid: status });
  }, [getMonthlyData, upsertMonthlyData]);

  // Scholarship Loans
  const addScholarshipLoan = useCallback((loan: Omit<ScholarshipLoan, 'id'>) => {
    setScholarshipLoans((prev) => [...prev, { ...loan, id: generateId() }]);
  }, []);
  const updateScholarshipLoan = useCallback((id: string, updates: Partial<ScholarshipLoan>) => {
    setScholarshipLoans((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }, []);
  const deleteScholarshipLoan = useCallback((id: string) => {
    setScholarshipLoans((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // Savings Goals
  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    setSavingsGoals((prev) => [...prev, { ...goal, id: generateId() }]);
  }, []);
  const updateSavingsGoal = useCallback((id: string, updates: Partial<SavingsGoal>) => {
    setSavingsGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...updates } : g)));
  }, []);
  const deleteSavingsGoal = useCallback((id: string) => {
    setSavingsGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // Transfer Records
  const addTransferRecord = useCallback((record: Omit<TransferRecord, 'id'>) => {
    setTransferRecords((prev) => [...prev, { ...record, id: generateId() }]);
  }, []);
  const updateTransferRecord = useCallback((id: string, updates: Partial<TransferRecord>) => {
    setTransferRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);
  const deleteTransferRecord = useCallback((id: string) => {
    setTransferRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Bank Accounts
  const addBankAccount = useCallback((account: Omit<BankAccount, 'id'>) => {
    setBankAccounts((prev) => [...prev, { ...account, id: generateId() }]);
  }, []);
  const updateBankAccount = useCallback((id: string, updates: Partial<BankAccount>) => {
    setBankAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);
  const deleteBankAccount = useCallback((id: string) => {
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const contextValue = useMemo<FinanceContextType>(() => ({
    fixedCosts, monthlyData, scholarshipLoans, savingsGoals, transferRecords, bankAccounts,
    scholarshipReserveInitial, setScholarshipReserveInitial,
    scholarshipReserveBonus, setScholarshipReserveBonus,
    scholarshipReserveBonusMonths, setScholarshipReserveBonusMonths,
    isCloudEnabled: !!supabase, syncStatus, isLoaded,
    selectedMonth, setSelectedMonth,
    getMonthlyData,
    addFixedCost, updateFixedCost, deleteFixedCost,
    updateMonthlySalary, addVariableCost, updateVariableCost, deleteVariableCost,
    toggleMonthlyPaidStatus,
    addScholarshipLoan, updateScholarshipLoan, deleteScholarshipLoan,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addTransferRecord, updateTransferRecord, deleteTransferRecord,
    addBankAccount, updateBankAccount, deleteBankAccount,
    syncFromCloud
  }), [
    fixedCosts, monthlyData, scholarshipLoans, savingsGoals, transferRecords, bankAccounts,
    scholarshipReserveInitial, setScholarshipReserveInitial,
    scholarshipReserveBonus, setScholarshipReserveBonus,
    scholarshipReserveBonusMonths, setScholarshipReserveBonusMonths,
    supabase, syncStatus, isLoaded, selectedMonth, setSelectedMonth,
    getMonthlyData,
    addFixedCost, updateFixedCost, deleteFixedCost,
    updateMonthlySalary, addVariableCost, updateVariableCost, deleteVariableCost,
    toggleMonthlyPaidStatus,
    addScholarshipLoan, updateScholarshipLoan, deleteScholarshipLoan,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addTransferRecord, updateTransferRecord, deleteTransferRecord,
    addBankAccount, updateBankAccount, deleteBankAccount,
    syncFromCloud
  ]);

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
