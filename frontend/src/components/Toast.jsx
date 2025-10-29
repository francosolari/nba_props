import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

const Toast = ({ toast, onRemove }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getBackgroundClass = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40';
      case 'error':
        return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/40';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40';
    }
  };

  const getTextClass = () => {
    switch (toast.type) {
      case 'success':
        return 'text-emerald-900 dark:text-emerald-100';
      case 'error':
        return 'text-rose-900 dark:text-rose-100';
      case 'warning':
        return 'text-amber-900 dark:text-amber-100';
      default:
        return 'text-blue-900 dark:text-blue-100';
    }
  };

  return (
    <div
      className={`
        pointer-events-auto
        min-w-[320px] max-w-md
        rounded-xl border shadow-lg
        p-4 flex items-start gap-3
        backdrop-blur-xl
        animate-in slide-in-from-right fade-in
        ${getBackgroundClass()}
      `}
    >
      {getIcon()}
      <div className="flex-1">
        <p className={`text-sm font-medium whitespace-pre-line ${getTextClass()}`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className={`shrink-0 rounded-lg p-1 transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${getTextClass()}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
