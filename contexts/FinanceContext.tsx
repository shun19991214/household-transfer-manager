import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { CostItem, MonthlyData, FinanceContextType, FirebaseConfig } from '../types';
import { generateId } from '../utils/format';
import { firebaseConfig } from '../firebaseConfig';

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const STORAGE_KEY_FIXED = 'finance_app_fixed_costs';
const STORAGE_KEY_MONTHLY = 'finance_app_monthly_data';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fixedCosts, setFixedCosts] = useState<CostItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [db, setDb] = useState<Firestore | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false); // New flag to track if initial cloud fetch is done

  // Load from LocalStorage on mount and Initialize Firebase
  useEffect(() => {
    try {
      const storedFixed = localStorage.getItem(STORAGE_KEY_FIXED);
      const storedMonthly = localStorage.getItem(STORAGE_KEY_MONTHLY);

      if (storedFixed) setFixedCosts(JSON.parse(storedFixed));
      if (storedMonthly) setMonthlyData(JSON.parse(storedMonthly));

      // Initialize Firebase if config is present
      if (firebaseConfig && firebaseConfig.apiKey) {
        initializeFirebase(firebaseConfig);
      }
    } catch (error) {
      console.error("Failed to load data from storage", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Initialize Firebase
  const initializeFirebase = (config: FirebaseConfig) => {
    try {
      const appName = 'finance-app';
      let app;
      if (getApps().length === 0) {
        app = initializeApp(config, appName);
      } else {
        // Try to get existing app, fallback to init
        try {
             app = getApp(appName);
        } catch {
             app = initializeApp(config, appName);
        }
      }
      const firestore = getFirestore(app);
      setDb(firestore);
    } catch (error) {
      console.error("Failed to initialize Firebase", error);
    }
  };

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY_FIXED, JSON.stringify(fixedCosts));
  }, [fixedCosts, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEY_MONTHLY, JSON.stringify(monthlyData));
  }, [monthlyData, isLoaded]);

  // Manual/Auto Sync from Cloud
  const syncFromCloud = async () => {
    if (!db) {
      throw new Error("Cloud connection not established. Check firebaseConfig.ts");
    }
    try {
      const docRef = doc(db, 'finance', 'data');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.fixedCosts) setFixedCosts(data.fixedCosts);
        if (data.monthlyData) setMonthlyData(data.monthlyData);
      }
    } catch (error) {
      console.error("Error fetching from Firestore", error);
      throw error;
    }
  };

  // Automatic Cloud Fetch on DB Connection
  useEffect(() => {
    if (!db) return;

    const fetchInitialData = async () => {
      try {
        // Attempt to fetch data from cloud when connection is established
        await syncFromCloud();
      } catch (error) {
        console.error("Initial cloud sync failed:", error);
      } finally {
        // Mark as synced regardless of success to allow subsequent saves (if offline, we rely on local)
        setIsCloudSynced(true);
      }
    };

    fetchInitialData();
  }, [db]);

  // Sync to Cloud (Debounced effect)
  useEffect(() => {
    // IMPORTANT: Do not save to cloud until we have attempted to fetch from it.
    // This prevents overwriting cloud data with potentially stale local data on startup.
    if (!db || !isLoaded || !isCloudSynced) return;

    const saveData = async () => {
      try {
        await setDoc(doc(db, 'finance', 'data'), {
          fixedCosts,
          monthlyData,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error writing to Firestore", error);
      }
    };

    const timeoutId = setTimeout(saveData, 1000); // Debounce 1s
    return () => clearTimeout(timeoutId);
  }, [fixedCosts, monthlyData, db, isLoaded, isCloudSynced]);

  // Helper to get or create monthly data
  const getMonthlyData = useCallback((month: string): MonthlyData => {
    const found = monthlyData.find((d) => d.month === month);
    if (found) return found;
    
    return {
      id: generateId(),
      month,
      salary: 0,
      variableCosts: [],
      isPaid: false
    };
  }, [monthlyData]);

  // Fixed Costs Actions
  const addFixedCost = (name: string, amount: number) => {
    setFixedCosts((prev) => [...prev, { id: generateId(), name, amount }]);
  };

  const updateFixedCost = (id: string, name: string, amount: number) => {
    setFixedCosts((prev) => prev.map((item) => (item.id === id ? { ...item, name, amount } : item)));
  };

  const deleteFixedCost = (id: string) => {
    setFixedCosts((prev) => prev.filter((item) => item.id !== id));
  };

  // Monthly Data Actions helpers
  const upsertMonthlyData = (newData: MonthlyData) => {
    setMonthlyData((prev) => {
      const exists = prev.some((d) => d.month === newData.month);
      if (exists) {
        return prev.map((d) => (d.month === newData.month ? newData : d));
      }
      return [...prev, newData];
    });
  };

  const updateMonthlySalary = (month: string, salary: number) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({ ...current, salary });
  };

  const addVariableCost = (month: string, name: string, amount: number) => {
    const current = getMonthlyData(month);
    const newCost: CostItem = { id: generateId(), name, amount };
    upsertMonthlyData({
      ...current,
      variableCosts: [...current.variableCosts, newCost]
    });
  };

  const updateVariableCost = (month: string, costId: string, name: string, amount: number) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({
      ...current,
      variableCosts: current.variableCosts.map(c => c.id === costId ? { ...c, name, amount } : c)
    });
  };

  const deleteVariableCost = (month: string, costId: string) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({
      ...current,
      variableCosts: current.variableCosts.filter(c => c.id !== costId)
    });
  };

  const toggleMonthlyPaidStatus = (month: string, status: boolean) => {
    const current = getMonthlyData(month);
    upsertMonthlyData({ ...current, isPaid: status });
  };

  return (
    <FinanceContext.Provider
      value={{
        fixedCosts,
        monthlyData,
        firebaseConfig: firebaseConfig, // expose the static config
        isCloudEnabled: !!db,
        getMonthlyData,
        addFixedCost,
        updateFixedCost,
        deleteFixedCost,
        updateMonthlySalary,
        addVariableCost,
        updateVariableCost,
        deleteVariableCost,
        toggleMonthlyPaidStatus,
        syncFromCloud
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};