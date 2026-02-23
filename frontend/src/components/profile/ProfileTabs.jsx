import React from "react";
import { LayoutDashboard, Trophy, Target, Edit2, Settings } from "lucide-react";

export default function ProfileTabs({ activeTab, setActiveTab, canEdit }) {
    const tabs = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "standings", label: "Standings", icon: Trophy },
        { id: "questions", label: "Questions", icon: Target },
        ...(canEdit ? [{ id: "submissions", label: "Submissions", icon: Edit2 }] : []),
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="mb-6 sm:mb-8">
            <div className="flex p-1 bg-white dark:bg-[#151e32] rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm w-full">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`relative flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === t.id
                            ? "text-white shadow-md"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                    >
                        {activeTab === t.id && (
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl"></div>
                        )}
                        <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                            <t.icon className={`w-4 h-4 sm:w-4 sm:h-4 ${activeTab === t.id ? "text-white" : "opacity-70"}`} />
                            <span className="hidden sm:inline">{t.label}</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
