import React from "react";
import { Check, X, Clock3 } from "lucide-react";

export default function QuestionsTab({ answers }) {
    return (
        <section className="court-question-ledger">
            <header><div><span className="court-kicker">Answer book</span><h3>Question predictions</h3></div><strong>{answers.length}<small> total</small></strong></header>
            <div className="court-question-ledger__head" aria-hidden="true"><span>No. / call</span><span>Result</span><span>Pts</span></div>
            {answers.length === 0 ? <p className="court-profile-empty">No questions answered for this season.</p> : answers.map((answer, index) => {
                const correct = answer.is_correct === true;
                const incorrect = answer.is_correct === false;
                const StatusIcon = correct ? Check : incorrect ? X : Clock3;
                const status = correct ? "Correct" : incorrect ? "Miss" : "Open";
                return <article className={`court-question-row ${correct ? "is-correct" : incorrect ? "is-wrong" : "is-open"}`} key={`${answer.question_text}-${index}`}><span className="court-question-index">{String(index + 1).padStart(2, "0")}</span><span className="court-question-copy"><strong>{answer.question_text}</strong><small>Your call: <b>{String(answer.answer)}</b>{answer.correct_answer && !correct ? ` · Official: ${String(answer.correct_answer)}` : ""}</small></span><span className="court-question-result"><StatusIcon />{status}</span><b className="court-question-points">{typeof answer.points_earned === "number" ? `+${answer.points_earned}` : "—"}</b></article>;
            })}
        </section>
    );
}
