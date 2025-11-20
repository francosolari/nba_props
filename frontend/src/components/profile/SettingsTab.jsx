import React from "react";
import { User as UserIcon, Mail, Key, LogOut } from "lucide-react";

const cardBase =
    "bg-white dark:bg-[#151e32] border border-slate-200/60 dark:border-slate-700/50 shadow-sm rounded-2xl overflow-hidden";

export default function SettingsTab({ handleLogout }) {
    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className={`${cardBase} p-6`}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-teal-500" />
                    Account Settings
                </h3>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                <Mail className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Email Address</p>
                                <p className="text-xs text-slate-500">Manage your email preferences</p>
                            </div>
                        </div>
                        <a href="/accounts/email/" className="text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400">
                            Update
                        </a>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                <Key className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Password</p>
                                <p className="text-xs text-slate-500">Change your security key</p>
                            </div>
                        </div>
                        <a href="/accounts/password/change/" className="text-sm font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400">
                            Change
                        </a>
                    </div>
                </div>
            </div>

            <div className={`${cardBase} p-6`}>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all font-bold"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
