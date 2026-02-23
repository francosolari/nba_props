import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const SimulationModal = ({ show, onClose, onEnable, section }) => {
  if (!show) return null;
  const isStandings = section === 'standings';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-[95%] max-w-sm max-h-[90dvh] overflow-y-auto p-8 text-center animate-in zoom-in-95 duration-200 my-auto">
        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Enable Simulator?</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed font-bold">
          {isStandings
            ? "Drag teams to see how points would change. Real data won't be affected."
            : 'Click answers to cycle unchanged, correct, and incorrect states. Every matching answer in that row follows the same toggle, and multiple answers can be marked correct.'}
        </p>
        <div className="flex flex-col gap-2">
          <button className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-sky-500/20" onClick={onEnable}>Enable Simulation</button>
          <button className="w-full py-3 bg-transparent text-slate-400 hover:text-slate-600 font-black text-xs uppercase tracking-widest" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
