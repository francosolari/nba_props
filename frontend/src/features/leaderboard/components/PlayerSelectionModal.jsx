import React from 'react';
import { X, Search, CheckCircle2 } from 'lucide-react';

export const PlayerSelectionModal = ({
  show,
  onClose,
  manageQuery,
  setManageQuery,
  withSimTotals,
  selectedUserIds,
  setSelectedUserIds,
  addUser
}) => {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    if (!show) {
      setIsReady(false);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [show]);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-[95%] md:w-full max-w-lg max-h-[92dvh] md:max-h-[85vh] flex flex-col overflow-hidden my-auto shadow-sky-500/10 transition-all duration-200 ${isReady ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]'}`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase tracking-[0.1em]">Select Players</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input value={manageQuery} onChange={(e) => setManageQuery(e.target.value)} placeholder="Search..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-sky-500/20" />
            </div>
            <button onClick={() => setSelectedUserIds((withSimTotals || []).map(e => String(e.user.id)))} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black uppercase text-slate-500 hover:text-slate-900 transition-all">All</button>
            <button onClick={() => setSelectedUserIds([])} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black uppercase text-rose-500 hover:bg-rose-50 transition-all">Clear</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(withSimTotals || [])
            .filter(e => !manageQuery.trim() || (e.user.display_name || e.user.username).toLowerCase().includes(manageQuery.toLowerCase()))
            .map(e => {
              const id = String(e.user.id);
              const isSel = selectedUserIds.includes(id);
              return (
                <div key={id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isSel ? 'bg-sky-50/50 border-sky-100 dark:bg-sky-950/20 dark:border-sky-800' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                  <label className="flex items-center gap-4 flex-1 cursor-pointer">
                    <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${isSel ? 'bg-sky-600 border-sky-600' : 'border-slate-200 dark:border-slate-700'}`}>
                      {isSel && <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={isSel} onChange={(ev) => ev.target.checked ? addUser(id) : setSelectedUserIds(prev => prev.filter(x => x !== id))} />
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-800 dark:text-white">{e.user.display_name || e.user.username}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Rank #{e.rank}</span>
                    </div>
                  </label>
                </div>
              );
            })}
        </div>
        <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <button onClick={onClose} className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98] shadow-lg shadow-slate-900/10 dark:shadow-white/5">Done</button>
        </div>
      </div>
    </div>
  );
};
