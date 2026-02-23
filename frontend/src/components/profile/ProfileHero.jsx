import React from "react";
import { ChevronDown } from "lucide-react";

const containerClasses = "container mx-auto px-4 max-w-[1216px] pb-20";

function avatarUrl(name) {
    const n = (name || "User").trim();
    return `https://avatar-placeholder.iran.liara.run/username/${encodeURIComponent(n)}?width=160&height=160&fontSize=64`;
}

export default function ProfileHero({ me, seasons, selectedSeason, onSeasonChange }) {
    return (
        <div className="relative rounded-xl md:rounded-2xl mx-2 md:mx-4 my-0 md:my-4 overflow-hidden border border-slate-700/50 dark:border-slate-700/50 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f]/95 via-[#2a4a6f]/95 to-[#5f1e2e]/95 dark:bg-slate-800/95 backdrop-blur-xl"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#2a4a6f]/40 via-transparent to-[#5f1e2e]/20 dark:from-slate-700/30 dark:via-transparent dark:to-slate-700/30"></div>

            <div className="relative z-10 pb-3 md:pb-8 pt-2 md:pt-6">
                <div className={`${containerClasses}`}>
                    <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-2 md:gap-6">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 blur"></div>
                                <div className="relative h-16 w-16 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-full overflow-hidden border-4 border-white/20 dark:border-slate-900 bg-slate-200 dark:bg-slate-800">
                                    <img
                                        alt="Avatar"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        src={avatarUrl(me?.user?.display_name || me?.user?.username)}
                                    />
                                </div>
                                <div className="absolute bottom-0 right-0 bg-white/20 dark:bg-slate-900 rounded-full p-0.5 sm:p-1 border border-white/30 dark:border-slate-700">
                                    <div className="bg-teal-500 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white/20 dark:border-slate-900"></div>
                                </div>
                            </div>

                            <div className="text-center md:text-left">
                                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                                    {me?.user?.display_name || me?.user?.username}
                                </h1>
                                <p className="text-xs sm:text-base text-slate-300 dark:text-slate-400 font-medium flex items-center justify-center md:justify-start gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                                    @{me?.user?.username}
                                    <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></span>
                                    <span className="text-teal-300 dark:text-teal-400">Member</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-3 bg-white/10 dark:bg-slate-800/50 backdrop-blur-md p-0.5 sm:p-1.5 rounded-lg sm:rounded-xl border border-white/20 dark:border-slate-700/50">
                            <div className="relative">
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => onSeasonChange(e.target.value)}
                                    className="appearance-none bg-transparent text-white dark:text-white text-xs sm:text-sm font-semibold pl-2 sm:pl-4 pr-6 sm:pr-10 py-1 sm:py-2 rounded-lg focus:outline-none focus:bg-white/20 dark:focus:bg-slate-700/50 transition-colors cursor-pointer"
                                >
                                    {seasons.map((s) => (
                                        <option key={s.slug} value={s.slug} className="bg-[#1e3a5f] dark:bg-slate-800 text-white dark:text-white">
                                            {s.slug}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-1.5 sm:right-3 top-1/2 h-3 w-3 sm:h-4 sm:w-4 -translate-y-1/2 text-white/80 dark:text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
