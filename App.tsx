import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layers, Calendar, PieChart, BarChart3, Landmark } from 'lucide-react';
import { FinanceProvider, useFinance } from './contexts/FinanceContext';
import { ToastProvider, LoadingScreen, SyncIndicator } from './components/UIComponents';
import FixedCostSettings from './components/FixedCostSettings';
import MonthlyInput from './components/MonthlyInput';
import SummaryDashboard from './components/SummaryDashboard';
import ExpenseCharts from './components/ExpenseCharts';
import AssetManager from './components/AssetManager';

// @ts-ignore - JSX file for class component compatibility
import ErrorBoundary from './components/ErrorBoundary.jsx';

// ============ Navigation (5 pages) ============
interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  color: string;
}

const navItems: NavItem[] = [
  { to: '/', icon: <PieChart className="w-5 h-5" />, label: 'ホーム', color: 'text-indigo-500' },
  { to: '/input', icon: <Calendar className="w-5 h-5" />, label: '入力', color: 'text-amber-500' },
  { to: '/charts', icon: <BarChart3 className="w-5 h-5" />, label: 'グラフ', color: 'text-blue-500' },
  { to: '/assets', icon: <Landmark className="w-5 h-5" />, label: '資産', color: 'text-teal-500' },
  { to: '/settings', icon: <Layers className="w-5 h-5" />, label: '設定', color: 'text-violet-500' },
];

const NavLink: React.FC<{ item: NavItem }> = ({ item }) => {
  const location = useLocation();
  const isActive = location.pathname === item.to;

  return (
    <Link
      to={item.to}
      className={`flex flex-col items-center justify-center w-full h-full py-1.5 transition-all duration-200 min-h-[48px] ${
        isActive ? item.color : 'text-slate-400 hover:text-slate-600'
      }`}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className={`mb-0.5 ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
        {item.icon}
      </div>
      <span className="text-xs font-medium">{item.label}</span>
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isCloudEnabled, syncStatus } = useFinance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 font-sans text-slate-900">
      <main className="container mx-auto px-4 py-6 pb-24 md:pt-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation - 5 items, no "More" menu */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg z-50 md:hidden" aria-label="メインナビゲーション">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink key={item.to} item={item} />
          ))}
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-50" aria-label="メインナビゲーション">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              おうちのかけいぼ
            </h1>
            {isCloudEnabled && <SyncIndicator status={syncStatus} />}
          </div>
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? `${item.color} bg-slate-100`
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {React.cloneElement(item.icon as React.ReactElement, { className: 'w-4 h-4' })}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isLoaded } = useFinance();

  if (!isLoaded) return <LoadingScreen />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<SummaryDashboard />} />
        <Route path="/input" element={<MonthlyInput />} />
        <Route path="/charts" element={<ExpenseCharts />} />
        <Route path="/assets" element={<AssetManager />} />
        <Route path="/settings" element={<FixedCostSettings />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <FinanceProvider>
        <ToastProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </ToastProvider>
      </FinanceProvider>
    </ErrorBoundary>
  );
};

export default App;
