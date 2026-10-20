import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import {
  collection, doc, getDocFromServer, getDocs, limit, onSnapshot, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore';
import { CostItem, MonthlyData, ScholarshipLoan, SavingsGoal, TransferRecord, BankAccount, FinanceContextType, ExpenseCategory, DEFAULT_BONUS_MONTHS, CloudStatus, CloudUser } from '../types';
import { generateId } from '../utils/format';
import { getFirebase, HOUSEHOLDS_COLLECTION } from '../utils/firebase';
import {
  FinancePayload, mergeRemotePayload, sanitizeBonusMonths, stableStringify, byteLength,
  PAYLOAD_HARD_LIMIT_BYTES, PAYLOAD_WARN_BYTES,
} from '../utils/financePayload';

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

const describeError = (error: unknown): string => {
  const code = (error as { code?: string })?.code;
  if (code === 'permission-denied') return 'アクセス権限がありません。世帯メンバーに登録されているか確認してください。';
  if (code === 'unavailable') return 'クラウドに接続できません。ネットワークを確認してください。';
  return error instanceof Error ? error.message : String(error);
};

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
  const [isLoaded, setIsLoaded] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>(() => (getFirebase() ? 'initializing' : 'disabled'));
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonthRaw] = useState(defaultMonth);

  // Guard against empty string month values from cleared inputs
  const setSelectedMonth = useCallback((month: string) => {
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      setSelectedMonthRaw(month);
    }
  }, []);

  // Load from LocalStorage on mount
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
        if (Array.isArray(arr)) setScholarshipReserveBonusMonthsState(sanitizeBonusMonths(arr));
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

  // ============ Cloud sync (Firestore: households/{householdId}.data) ============

  const payload = useMemo<FinancePayload>(() => ({
    fixedCosts, monthlyData, scholarshipLoans, savingsGoals, transferRecords, bankAccounts,
    scholarshipReserveInitial, scholarshipReserveBonus, scholarshipReserveBonusMonths,
  }), [fixedCosts, monthlyData, scholarshipLoans, savingsGoals, transferRecords, bankAccounts, scholarshipReserveInitial, scholarshipReserveBonus, scholarshipReserveBonusMonths]);
  const payloadKey = useMemo(() => stableStringify(payload), [payload]);

  // Latest local state, readable from snapshot callbacks without re-subscribing
  const payloadRef = useRef(payload);
  const payloadKeyRef = useRef(payloadKey);
  payloadRef.current = payload;
  payloadKeyRef.current = payloadKey;
  // Serialized payload last confirmed equal to the cloud copy; local state differing from it means unsaved edits
  const lastSyncedKeyRef = useRef<string | null>(null);

  const applyPayload = useCallback((p: FinancePayload) => {
    setFixedCosts(p.fixedCosts);
    setMonthlyData(p.monthlyData);
    setScholarshipLoans(p.scholarshipLoans);
    setSavingsGoals(p.savingsGoals);
    setTransferRecords(p.transferRecords);
    setBankAccounts(p.bankAccounts);
    setScholarshipReserveInitialState(p.scholarshipReserveInitial);
    setScholarshipReserveBonusState(p.scholarshipReserveBonus);
    setScholarshipReserveBonusMonthsState(p.scholarshipReserveBonusMonths);
  }, []);

  const applyRemote = useCallback((remote: unknown) => {
    const merged = mergeRemotePayload(payloadRef.current, remote);
    lastSyncedKeyRef.current = stableStringify(merged);
    applyPayload(merged);
  }, [applyPayload]);

  // Resolve the signed-in user's household
  useEffect(() => {
    const fb = getFirebase();
    if (!fb) return;
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(fb.auth, async (user) => {
      lastSyncedKeyRef.current = null;
      setHouseholdId(null);
      setSyncStatus('idle');
      setCloudMessage(null);
      if (!user) {
        setCloudUser(null);
        setCloudStatus('signed-out');
        return;
      }
      setCloudUser({ uid: user.uid, email: user.email, displayName: user.displayName });
      setCloudStatus('loading');
      try {
        // Must match the rules' membership condition for list queries to be allowed
        const snap = await getDocs(query(
          collection(fb.db, HOUSEHOLDS_COLLECTION),
          where('members', 'array-contains', user.uid),
          limit(2),
        ));
        if (cancelled || fb.auth.currentUser?.uid !== user.uid) return;
        if (snap.empty) {
          setCloudStatus('no-household');
          return;
        }
        if (snap.size > 1) console.warn('User belongs to multiple households; using the first one');
        const ids = snap.docs.map((d) => d.id).sort();
        setHouseholdId(ids[0]);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to resolve household', error);
        setCloudMessage(describeError(error));
        setCloudStatus('error');
      }
    });

    return () => { cancelled = true; unsubscribe(); };
  }, []);

  // Live subscription to the household document
  useEffect(() => {
    const fb = getFirebase();
    if (!fb || !householdId) return;
    const ref = doc(fb.db, HOUSEHOLDS_COLLECTION, householdId);

    const unsubscribe = onSnapshot(ref, (snap) => {
      // Our own pending write echoing back; nothing new
      if (snap.metadata.hasPendingWrites) return;
      if (!snap.exists()) {
        setCloudStatus('no-household');
        return;
      }
      const remote = snap.data().data;
      const isFirstLoad = lastSyncedKeyRef.current === null;
      const hasUnsavedLocalEdits = !isFirstLoad && payloadKeyRef.current !== lastSyncedKeyRef.current;
      if (hasUnsavedLocalEdits) {
        // Local edits are about to be saved and will overwrite the remote change (last write wins)
        console.warn('Remote update ignored because local edits are pending');
        return;
      }
      applyRemote(remote);
      setSyncStatus('saved');
      if (isFirstLoad) setCloudStatus('ready');
    }, (error) => {
      console.error('Household subscription failed', error);
      setCloudMessage(describeError(error));
      setSyncStatus('error');
      setCloudStatus('error');
    });

    return unsubscribe;
  }, [householdId, applyRemote]);

  // Auto-save to Firestore (debounced)
  useEffect(() => {
    const fb = getFirebase();
    if (!fb || !householdId || !isLoaded || cloudStatus !== 'ready') return;
    if (payloadKey === lastSyncedKeyRef.current) return;

    const size = byteLength(payloadKey);
    if (size > PAYLOAD_HARD_LIMIT_BYTES) {
      setCloudMessage(`データサイズ (${Math.round(size / 1024)} KB) が Firestore の上限を超えるため保存できません。古いデータの整理が必要です。`);
      setSyncStatus('error');
      return;
    }
    setCloudMessage(size > PAYLOAD_WARN_BYTES
      ? `データサイズが ${Math.round(size / 1024)} KB で、保存上限 (約 1 MB) に近づいています。`
      : null);

    setSyncStatus('saving');
    const keyToSave = payloadKey;
    const dataToSave = payload;
    const timeoutId = setTimeout(async () => {
      try {
        await updateDoc(doc(fb.db, HOUSEHOLDS_COLLECTION, householdId), {
          data: dataToSave,
          updatedAt: serverTimestamp(),
          updatedBy: fb.auth.currentUser?.uid ?? null,
        });
        lastSyncedKeyRef.current = keyToSave;
        setSyncStatus('saved');
      } catch (error) {
        console.error('Error writing to Firestore', error);
        setCloudMessage(describeError(error));
        setSyncStatus('error');
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [payload, payloadKey, householdId, isLoaded, cloudStatus]);

  // Manual pull: overwrite local state with the server copy
  const syncFromCloud = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) throw new Error("クラウド未設定です。VITE_FIREBASE_* 環境変数を設定してください。");
    if (!householdId) throw new Error("世帯データに接続されていません。");
    try {
      const snap = await getDocFromServer(doc(fb.db, HOUSEHOLDS_COLLECTION, householdId));
      if (snap.exists()) applyRemote(snap.data().data);
    } catch (error) {
      console.error("Error fetching from Firestore", error);
      throw error;
    }
  }, [householdId, applyRemote]);

  const signIn = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) throw new Error("クラウド未設定です。");
    try {
      await signInWithPopup(fb.auth, fb.googleProvider);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const fb = getFirebase();
    if (!fb) return;
    await firebaseSignOut(fb.auth);
  }, []);

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
    isCloudEnabled: cloudStatus === 'ready', cloudStatus, cloudUser, cloudMessage, signIn, signOut,
    syncStatus, isLoaded,
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
    cloudStatus, cloudUser, cloudMessage, signIn, signOut,
    syncStatus, isLoaded, selectedMonth, setSelectedMonth,
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
