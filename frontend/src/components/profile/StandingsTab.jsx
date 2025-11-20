import React, { useMemo, useCallback } from "react";
import { Trophy } from "lucide-react";

const cardBase =
    "bg-white dark:bg-[#151e32] border border-slate-200/60 dark:border-slate-700/50 shadow-sm rounded-2xl overflow-hidden";

export default function StandingsTab({ standings }) {
    const confLists = useMemo(() => {
        const preds = (standings?.predictions || []).slice();
        const west = [];
        const east = [];
        preds.forEach((p) => {
            const isWest = String(p?.conference || "")
                .toLowerCase()
                .startsWith("w");
            (isWest ? west : east).push(p);
        });
        const order = (arr) =>
            arr.sort((a, b) => (a.predicted_position || 999) - (b.predicted_position || 999));
        return { west: order(west), east: order(east) };
    }, [standings]);

    const teamSlug = useCallback((name = '') =>
        name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-'), []);

    return (
        <div className="space-y-6">
            <div className={`${cardBase} p-6`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-teal-500" />
                        Regular Season Standings
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            <span className="text-slate-600 dark:text-slate-400">Exact (3pts)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            <span className="text-slate-600 dark:text-slate-400">Close (1pt)</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {[
                        { title: "Eastern Conference", list: confLists.east, color: "blue" },
                        { title: "Western Conference", list: confLists.west, color: "rose" },
                    ].map(({ title, list, color }) => (
                        <div key={title} className="space-y-3">
                            <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'}`}>
                                <span className="font-bold text-sm uppercase tracking-wide">{title}</span>
                            </div>

                            {list.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 text-sm italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                                    No predictions available
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {list.map((p) => {
                                        const points = p.points || 0;
                                        const isExact = points === 3;
                                        const isClose = points === 1;

                                        return (
                                            <div key={`${p.team}-${p.predicted_position}`} className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-md ${isExact ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" :
                                                isClose ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" :
                                                    "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
                                                }`}>
                                                <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${isExact ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                                                    isClose ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" :
                                                        "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                                    }`}>
                                                    {p.predicted_position}
                                                </div>

                                                <img
                                                    className="w-8 h-8 object-contain"
                                                    src={`/static/img/teams/${teamSlug(p.team)}.png`}
                                                    alt={p.team}
                                                    onError={(e) => { e.currentTarget.src = '/static/img/teams/unknown.svg'; }}
                                                />

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate">{p.team}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">Actual: #{p.actual_position ?? "-"}</div>
                                                </div>

                                                {points > 0 && (
                                                    <div className={`text-sm font-bold ${isExact ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                                                        +{points}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
