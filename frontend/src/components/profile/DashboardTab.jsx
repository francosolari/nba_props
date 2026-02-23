import React from "react";
import { BarChart3, Award, Target, ExternalLink, Sparkles, CheckCircle2, XCircle, Hourglass, Crown, AlertCircle } from "lucide-react";

const cardBase =
    "bg-white dark:bg-[#151e32] border border-slate-200/60 dark:border-slate-700/50 shadow-sm rounded-2xl overflow-hidden";

export default function DashboardTab({ standings, awards, props, answers, interestingStats, statsLoading, setActiveTab, compareHref }) {
    return (
        <div className="space-y-6">
            {/* Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                    { title: "Standings", data: standings, icon: BarChart3, color: "teal", href: compareHref },
                    { title: "Awards", data: awards, icon: Award, color: "amber", href: null },
                    { title: "Props", data: props, icon: Target, color: "rose", href: null },
                ].map((cat) => {
                    const pct = cat.data.max_points > 0 ? Math.round((cat.data.points / cat.data.max_points) * 100) : 0;
                    const colors = {
                        teal: "text-teal-500 bg-teal-500",
                        amber: "text-amber-500 bg-amber-500",
                        rose: "text-rose-500 bg-rose-500",
                    };

                    return (
                        <div key={cat.title} className={`${cardBase} p-6 hover:shadow-lg transition-all duration-300 group cursor-default`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 ${colors[cat.color].split(' ')[0]}`}>
                                        <cat.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{cat.title}</h3>
                                </div>
                                {cat.href && (
                                    <a href={cat.href} className="text-slate-400 hover:text-teal-500 transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>

                            <div className="mb-4">
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-3xl font-bold text-slate-900 dark:text-white">{cat.data.points || 0}</span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 mb-1.5">/ {cat.data.max_points || 0} pts</span>
                                    <span className="ml-auto text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                        {pct}%
                                    </span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${colors[cat.color].split(' ')[1]} transition-all duration-1000 ease-out`}
                                        style={{ width: `${pct}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {cat.data.predictions?.length || 0} predictions made
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className={`${cardBase} p-6`}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-teal-500" />
                            Recent Activity
                        </h3>
                        {answers.length > 5 && (
                            <button onClick={() => setActiveTab("questions")} className="text-xs font-bold text-teal-500 hover:text-teal-600 uppercase tracking-wide">
                                View All
                            </button>
                        )}
                    </div>

                    {answers.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                            No predictions yet. Start playing!
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {answers.slice(0, 5).map((a, i) => {
                                const isCorrect = a.is_correct === true;
                                const isIncorrect = a.is_correct === false;

                                return (
                                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                                            isIncorrect ? "bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                                                "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                            }`}>
                                            {isCorrect ? <CheckCircle2 className="w-5 h-5" /> :
                                                isIncorrect ? <XCircle className="w-5 h-5" /> :
                                                    <Hourglass className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{a.question_text}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Answer: {String(a.answer)}</p>
                                        </div>
                                        {typeof a.points_earned === "number" && (
                                            <span className={`text-sm font-bold ${a.points_earned > 0 ? "text-emerald-500" : "text-slate-400"}`}>
                                                +{a.points_earned}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Insights */}
                <div className="space-y-6">
                    {!statsLoading && interestingStats && (interestingStats.unique_wins?.length > 0 || interestingStats.rare_wins?.length > 0 || interestingStats.close_calls?.length > 0) && (
                        <>
                            {interestingStats.unique_wins?.length > 0 && (
                                <div className={`${cardBase} p-6 border-amber-200/50 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-[#151e32]`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Crown className="w-5 h-5 text-amber-500" />
                                        <h3 className="font-bold text-slate-900 dark:text-white">Unique Wins</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {interestingStats.unique_wins.map((stat, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-100 dark:border-amber-500/20 shadow-sm">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{stat.question}</p>
                                                    <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">+{stat.points_earned}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Only you got this right!</p>
                                                {stat.your_answer && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">Your answer: {stat.your_answer}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {interestingStats.rare_wins?.length > 0 && (
                                <div className={`${cardBase} p-6 border-violet-200/50 dark:border-violet-500/20 bg-gradient-to-br from-violet-50 to-white dark:from-violet-900/10 dark:to-[#151e32]`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Sparkles className="w-5 h-5 text-violet-500" />
                                        <h3 className="font-bold text-slate-900 dark:text-white">Rare Wins</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {interestingStats.rare_wins.map((stat, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-violet-100 dark:border-violet-500/20 shadow-sm">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{stat.question}</p>
                                                    <span className="text-violet-600 dark:text-violet-400 font-bold text-sm">+{stat.points_earned}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Top {stat.correct_percentage}% of players</p>
                                                    {stat.total_correct && stat.total_answers && (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500">• {stat.total_correct}/{stat.total_answers} correct</span>
                                                    )}
                                                </div>
                                                {stat.your_answer && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">Your answer: {stat.your_answer}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {interestingStats.close_calls?.length > 0 && (
                                <div className={`${cardBase} p-6 border-blue-200/50 dark:border-blue-500/20 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-[#151e32]`}>
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertCircle className="w-5 h-5 text-blue-500" />
                                        <h3 className="font-bold text-slate-900 dark:text-white">Close Calls</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {interestingStats.close_calls.map((stat, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-500/20 shadow-sm">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{stat.question}</p>
                                                    <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">+{stat.points_earned || 0}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Barely missed!</p>
                                                {(stat.your_answer !== undefined && stat.correct_answer !== undefined) && (
                                                    <div className="text-xs mt-1.5 flex items-center gap-2">
                                                        <span className="text-slate-600 dark:text-slate-300 font-medium">You: {stat.your_answer}</span>
                                                        <span className="text-slate-400">•</span>
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Actual: {stat.correct_answer}</span>
                                                    </div>
                                                )}
                                                {(stat.over_count !== undefined && stat.under_count !== undefined) && (
                                                    <div className="text-xs mt-1.5">
                                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                            <span>Over: {stat.over_count}</span>
                                                            <span className="text-slate-400">•</span>
                                                            <span>Under: {stat.under_count}</span>
                                                            {stat.split_percentage && (
                                                                <span className="ml-auto text-blue-600 dark:text-blue-400 font-semibold">({stat.split_percentage}% split)</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {(!interestingStats || (!interestingStats?.unique_wins?.length && !interestingStats?.rare_wins?.length && !interestingStats?.close_calls?.length)) && !statsLoading && (
                        <div className={`${cardBase} p-8 flex flex-col items-center justify-center text-center h-full min-h-[200px]`}>
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                <BarChart3 className="w-6 h-6 text-slate-400" />
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white mb-1">More Insights Coming</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                                Keep making predictions to unlock unique stats and achievements.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
