import React from "react";
import { BarChart3, Award, Target, ArrowUpRight, Check, X, Clock3, Crown, Sparkles, AlertCircle } from "lucide-react";

const statusFor = (answer) => {
    if (answer.is_correct === true) return { label: "Hit", icon: Check, tone: "hit" };
    if (answer.is_correct === false) return { label: "Miss", icon: X, tone: "miss" };
    return { label: "Open", icon: Clock3, tone: "open" };
};

const featureRows = (interestingStats) => {
    const stats = interestingStats || {};
    return [
        ...(stats.unique_wins || []).map((item) => ({ ...item, label: "Only you", icon: Crown, tone: "gold" })),
        ...(stats.rare_wins || []).map((item) => ({ ...item, label: "Rare call", icon: Sparkles, tone: "blue" })),
        ...(stats.close_calls || []).map((item) => ({ ...item, label: "Close call", icon: AlertCircle, tone: "red" })),
    ].slice(0, 5);
};

export default function DashboardTab({ standings, awards, props, answers, interestingStats, statsLoading, setActiveTab, compareHref }) {
    const categories = [
        { title: "Standings", data: standings, icon: BarChart3, href: compareHref },
        { title: "Awards", data: awards, icon: Award },
        { title: "Props", data: props, icon: Target },
    ];
    const moments = featureRows(interestingStats);

    return (
        <div className="court-profile-dashboard">
            <section className="court-category-ledger">
                <header><span>Category ledger</span><span>Score / available</span></header>
                {categories.map(({ title, data, icon: Icon, href }) => {
                    const maximum = Number(data.max_points || 0);
                    const points = Number(data.points || 0);
                    const pct = maximum > 0 ? Math.round((points / maximum) * 100) : 0;
                    const row = (
                        <><Icon /><span><strong>{title}</strong><small>{data.predictions?.length || 0} recorded picks</small></span><span className="court-ledger-score"><strong>{points}</strong><small>/ {maximum}</small></span><span className="court-ledger-percent">{pct}%</span>{href && <ArrowUpRight />}</>
                    );
                    return href ? <a className="court-category-row" href={href} key={title}>{row}</a> : <div className="court-category-row" key={title}>{row}</div>;
                })}
            </section>

            <div className="court-profile-editorial">
                <section className="court-calls-sheet">
                    <header><div><span className="court-kicker">Latest ledger</span><h3>Recent calls</h3></div>{answers.length > 5 && <button onClick={() => setActiveTab("questions")}>All calls <ArrowUpRight /></button>}</header>
                    {answers.length === 0 ? <p className="court-profile-empty">No calls recorded for this season.</p> : answers.slice(0, 6).map((answer, index) => {
                        const status = statusFor(answer);
                        const StatusIcon = status.icon;
                        return <article className={`court-call-row is-${status.tone}`} key={`${answer.question_text}-${index}`}><span className="court-call-number">{String(index + 1).padStart(2, "0")}</span><span><strong>{answer.question_text}</strong><small>Your call: {String(answer.answer)}</small></span><span className="court-call-status"><StatusIcon />{status.label}</span><b>{typeof answer.points_earned === "number" ? `+${answer.points_earned}` : "—"}</b></article>;
                    })}
                </section>

                <aside className="court-moments-sheet">
                    <header><span className="court-kicker">Margin notes</span><h3>Season moments</h3></header>
                    {statsLoading ? <p className="court-profile-empty">Reading the scorebook…</p> : moments.length === 0 ? <p className="court-profile-empty">Not enough results yet. Your standout calls will collect here.</p> : moments.map((moment, index) => {
                        const MomentIcon = moment.icon;
                        return <article className={`court-moment-row is-${moment.tone}`} key={`${moment.question}-${index}`}><MomentIcon /><span><small>{moment.label}</small><strong>{moment.question}</strong>{moment.your_answer && <em>{moment.your_answer}</em>}</span><b>+{moment.points_earned || 0}</b></article>;
                    })}
                </aside>
            </div>
        </div>
    );
}
