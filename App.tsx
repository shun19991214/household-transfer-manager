import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layers, Calendar, PieChart } from 'lucide-react';
import { FinanceProvider } from './contexts/FinanceContext';
import FixedCostSettings from './components/FixedCostSettings';
import MonthlyInput from './components/MonthlyInput';
import SummaryDashboard from './components/SummaryDashboard';

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center w-full h-full py-2 transition-colors duration-200 ${
        isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <div className={`mb-1 ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="container mx-auto px-4 py-6 pb-24">
        {children}
      </main>
      
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 md:hidden">
        <div className="flex justify-around items-center h-16">
          <NavLink to="/" icon={<PieChart className="w-6 h-6" />} label="確認" />
          <NavLink to="/input" icon={<Calendar className="w-6 h-6" />} label="入力" />
          <NavLink to="/settings" icon={<Layers className="w-6 h-6" />} label="設定" />
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden md:block fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">Household Finance</h1>
          <div className="flex space-x-8">
             <Link to="/" className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-2">
               <PieChart className="w-4 h-4" /> 確認
             </Link>
             <Link to="/input" className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-2">
               <Calendar className="w-4 h-4" /> 入力
             </Link>
             <Link to="/settings" className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-2">
               <Layers className="w-4 h-4" /> 設定
             </Link>
          </div>
        </div>
      </nav>
      {/* Spacer for Desktop Top Nav */}
      <div className="hidden md:block h-16"></div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <FinanceProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<SummaryDashboard />} />
            <Route path="/input" element={<MonthlyInput />} />
            <Route path="/settings" element={<FixedCostSettings />} />
          </Routes>
        </Layout>
      </HashRouter>
    </FinanceProvider>
  );
};

export default App;
