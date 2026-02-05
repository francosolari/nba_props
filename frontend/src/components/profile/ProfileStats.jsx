import React from "react";
import { Crown, Zap, BarChart3, Target } from "lucide-react";

const glassCard =
    "bg-white/80 dark:bg-[#151e32]/80 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-xl";

export default function ProfileStats({ me, data, standings, awards, props }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
                { label: "Rank", value: me?.rank ? `#${me.rank}` : "—", sub: `${data?.length || 0} players`, icon: Crown, color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/5" },
                { label: "Total Points", value: me?.user?.total_points?.toLocaleString() || "0", sub: "All Categories", icon: Zap, color: "text-teal-400", bg: "from-teal-500/10 to-emerald-500/5" },
                { label: "Standings Pts", value: standings.points || 0, sub: `of ${standings.max_points || 0}`, icon: BarChart3, color: "text-blue-400", bg: "from-blue-500/10 to-indigo-500/5" },
                { label: "Props Pts", value: (awards.points || 0) + (props.points || 0), sub: `of ${(awards.max_points || 0) + (props.max_points || 0)}`, icon: Target, color: "text-rose-400", bg: "from-rose-500/10 to-pink-500/5" },
            ].map((stat, i) => (
                <div key={i} className={`${glassCard} p-4 sm:p-5 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                    <div className="relative flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{stat.sub}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 ${stat.color}`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
