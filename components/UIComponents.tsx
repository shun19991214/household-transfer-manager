import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ============ Card ============
type CardColor = 'default' | 'indigo' | 'violet' | 'amber' | 'teal' | 'emerald' | 'rose' | 'orange';

const cardColorStyles: Record<CardColor, string> = {
  default: 'bg-white border-slate-100',
  indigo: 'bg-indigo-50/30 border-l-4 border-l-indigo-400 border-slate-100',
  violet: 'bg-violet-50/30 border-l-4 border-l-violet-400 border-slate-100',
  amber: 'bg-amber-50/30 border-l-4 border-l-amber-400 border-slate-100',
  teal: 'bg-teal-50/30 border-l-4 border-l-teal-400 border-slate-100',
  emerald: 'bg-emerald-50/30 border-l-4 border-l-emerald-400 border-slate-100',
  rose: 'bg-rose-50/30 border-l-4 border-l-rose-400 border-slate-100',
  orange: 'bg-orange-50/30 border-l-4 border-l-orange-400 border-slate-100',
};

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  color?: CardColor;
  onClick?: () => void;
}> = ({ children, className = '', color = 'default', onClick }) => {
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }
    : undefined;

  return (
    <div
      className={`rounded-xl shadow-sm border overflow-hidden p-4 md:p-6 ${cardColorStyles[color]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};

// ============ Button ============
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'secondary' | 'success' | 'info';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 min-h-[44px]";

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm"
  };

  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500",
    info: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
  };

  return (
    <button className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// ============ IconButton ============
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'danger';
  label: string; // ARIA label required
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  className = '',
  variant = 'ghost',
  label,
  ...props
}) => {
  const variants = {
    ghost: 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
    danger: 'text-slate-400 hover:text-red-500 hover:bg-red-50',
  };

  return (
    <button
      className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg transition-colors inline-flex items-center justify-center ${variants[variant]} ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
};

// ============ Input ============
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', style, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={`block w-full rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 px-3 bg-white text-slate-900 placeholder:text-slate-400 min-h-[44px] ${type === 'number' ? '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none' : ''} ${className}`}
    style={{ colorScheme: 'light', ...style }}
    {...props}
  />
));
Input.displayName = 'Input';

// ============ ProgressBar ============
export const ProgressBar: React.FC<{ value: number; color?: string; className?: string; showLabel?: boolean }> = ({
  value,
  color = 'bg-indigo-500',
  className = '',
  showLabel = true,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div className={`w-full ${className}`} role="progressbar" aria-valuenow={clampedValue} aria-valuemin={0} aria-valuemax={100}>
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-slate-500 mt-1 text-right">{clampedValue.toFixed(1)}%</p>
      )}
    </div>
  );
};

// ============ PageHeader ============
export const PageHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode; // right-side actions
}> = ({ icon, title, description, children }) => (
  <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {description && <p className="text-slate-500 mt-1">{description}</p>}
    </div>
    {children && <div className="flex items-center gap-2">{children}</div>}
  </header>
);

// ============ Toast System ============
interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  onUndo?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: Toast['type'], onUndo?: () => void) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success', onUndo?: () => void) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, onUndo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[100] space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg px-4 py-3 shadow-lg text-sm font-medium flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200 ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-slate-800 text-white'
            }`}
          >
            <span>{toast.message}</span>
            {toast.onUndo && (
              <button
                onClick={() => {
                  toast.onUndo?.();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="ml-3 underline text-white/90 hover:text-white"
              >
                元に戻す
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ============ Loading Screen ============
export const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
        おうちのかけいぼ
      </p>
      <p className="text-sm text-slate-400 mt-1">読み込み中...</p>
    </div>
  </div>
);

// ============ Confirm Dialog ============
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'success' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = '実行', confirmVariant = 'danger', onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-xl p-6 mx-4 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600 mt-2">{message}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="secondary" onClick={onCancel}>キャンセル</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
};

// ============ SyncIndicator ============
export const SyncIndicator: React.FC<{ status: 'idle' | 'saving' | 'saved' | 'error' }> = ({ status }) => {
  const styles = {
    idle: 'bg-slate-300',
    saving: 'bg-amber-400 animate-pulse',
    saved: 'bg-emerald-400',
    error: 'bg-red-400',
  };
  const labels = {
    idle: '未接続',
    saving: '保存中...',
    saved: '同期済み',
    error: '同期エラー',
  };
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500">
      <div className={`w-2 h-2 rounded-full ${styles[status]}`} />
      <span>{labels[status]}</span>
    </div>
  );
};
