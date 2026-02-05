import React from "react";
import { Lock, Unlock, BarChart3, Target } from "lucide-react";
import EditablePredictionBoard from "../../components/EditablePredictionBoard";
import QuestionForm from "../../components/QuestionForm";

const cardBase =
    "bg-white dark:bg-[#151e32] border border-slate-200/60 dark:border-slate-700/50 shadow-sm rounded-2xl overflow-hidden";

export default function SubmissionsTab({ canEdit, selectedSeason, username, selectedSeasonObj }) {
    return (
        <div className="space-y-6">
            <div className={`${cardBase} p-6 border-l-4 ${canEdit ? "border-l-emerald-500" : "border-l-rose-500"}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${canEdit ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"}`}>
                        {canEdit ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {canEdit ? "Submissions Open" : "Submissions Locked"}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {canEdit
                                ? `You can edit your predictions for ${selectedSeason}. Changes save automatically.`
                                : `The submission window for ${selectedSeason} has closed.`}
                        </p>
                    </div>
                </div>
            </div>

            <div className={`${cardBase} p-6`}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-teal-500" />
                    Standings Predictions
                </h3>
                <EditablePredictionBoard
                    seasonSlug={selectedSeason}
                    canEdit={!!canEdit}
                    username={username}
                />
            </div>

            <div className={`${cardBase} p-6`}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5 text-teal-500" />
                    Question Predictions
                </h3>
                <QuestionForm
                    seasonSlug={selectedSeason}
                    canEdit={!!canEdit}
                    submissionEndDate={selectedSeasonObj?.submission_end_date || null}
                />
            </div>
        </div>
    );
}
