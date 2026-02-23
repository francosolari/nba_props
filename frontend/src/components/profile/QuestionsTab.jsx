import React from "react";
import { Target, CheckCircle2, XCircle, Hourglass } from "lucide-react";

const cardBase =
    "bg-white dark:bg-[#151e32] border border-slate-200/60 dark:border-slate-700/50 shadow-sm rounded-2xl overflow-hidden";

export default function QuestionsTab({ answers }) {
    return (
        <div className="space-y-6">
            <div className={`${cardBase} p-6`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-teal-500" />
                        Question Predictions
                    </h3>
                    <div className="text-sm text-slate-500">
                        <span className="font-bold text-slate-900 dark:text-white">{answers.length}</span> total
                    </div>
                </div>

                {answers.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                        No questions answered for this season.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {answers.map((a, idx) => {
                            const isCorrect = a.is_correct === true;
                            const isIncorrect = a.is_correct === false;

                            return (
                                <div key={idx} className={`p-4 rounded-xl border transition-all hover:shadow-md ${isCorrect ? "bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800" :
                                    isIncorrect ? "bg-rose-50/30 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800" :
                                        "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                    }`}>
                                    <div className="flex justify-between items-start gap-3 mb-3">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{a.question_text}</h4>
                                        {typeof a.points_earned === "number" && (
                                            <span className={`text-sm font-bold flex-shrink-0 ${a.points_earned > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                                                +{a.points_earned}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm mb-3">
                                        <span className="text-slate-500 dark:text-slate-400">Answer:</span>
                                        <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                                            {String(a.answer)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs font-medium">
                                        {isCorrect ? (
                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                                            </span>
                                        ) : isIncorrect ? (
                                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                                <XCircle className="w-3.5 h-3.5" /> Incorrect
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                                <Hourglass className="w-3.5 h-3.5" /> Pending
                                            </span>
                                        )}

                                        {a.correct_answer && !isCorrect && (
                                            <span className="text-slate-400 ml-auto">
                                                Correct: {String(a.correct_answer)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
