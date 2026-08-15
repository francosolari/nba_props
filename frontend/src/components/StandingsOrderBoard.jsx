import React, { useMemo } from "react";
import { ArrowUpRight, Check, GripVertical, LockKeyhole, Minus, Trophy } from "lucide-react";
import TeamLogo from "./TeamLogo";

export default function StandingsOrderBoard({ predictions = [], points = 0, maxPoints = 0, detailsHref, className = "" }) {
    const conferences = useMemo(() => {
        const grouped = { east: [], west: [] };
        predictions.forEach((prediction) => {
            const conference = String(prediction?.conference || prediction?.team_conference || "").toLowerCase();
            grouped[conference.startsWith("w") ? "west" : "east"].push(prediction);
        });
        const byPosition = (a, b) => (a.predicted_position || 999) - (b.predicted_position || 999);
        grouped.east.sort(byPosition);
        grouped.west.sort(byPosition);
        return grouped;
    }, [predictions]);

    return (
        <section className={`court-standings-book ${className}`.trim()}>
            <header className="court-standings-book__header">
                <div><Trophy /><h3>Regular season picks</h3></div>
                <div className="court-standings-book__score"><span>Score</span><strong>{points}</strong><small>/ {maxPoints}</small></div>
            </header>
            <div className="court-standings-legend" aria-label="Scoring legend">
                <span><LockKeyhole /> Locked team order</span>
                <span><Check /> Exact · 3 pts</span>
                <span><Minus /> Off by one · 1 pt</span>
                {detailsHref && <a href={detailsHref}>Advanced view <ArrowUpRight /></a>}
            </div>
            <div className="court-conference-grid">
                {[
                    { key: "east", title: "Eastern Conference" },
                    { key: "west", title: "Western Conference" },
                ].map(({ key, title }) => (
                    <section className={`court-conference-sheet is-${key}`} key={key}>
                        <header><h4>{title}</h4><span>Pick / finish / pts</span></header>
                        {conferences[key].length === 0 ? (
                            <p className="court-profile-empty">No standings picks recorded.</p>
                        ) : conferences[key].map((prediction) => {
                            const score = Number(prediction.points || 0);
                            const tone = score === 3 ? "exact" : score === 1 ? "close" : "miss";
                            const teamName = prediction.team || prediction.team_name || "Unknown team";
                            return (
                                <article className={`court-standing-line is-${tone}`} key={`${teamName}-${prediction.predicted_position}`}>
                                    <GripVertical className="court-standing-grip" aria-hidden="true" />
                                    <strong className="court-standing-pick">{prediction.predicted_position}</strong>
                                    <TeamLogo className="court-standing-logo" teamName={teamName} />
                                    <span className="court-standing-team"><strong>{teamName}</strong><small>Predicted seed</small></span>
                                    <span className="court-standing-actual"><small>Finish</small><strong>#{prediction.actual_position ?? "—"}</strong></span>
                                    <b>{score > 0 ? `+${score}` : "—"}</b>
                                </article>
                            );
                        })}
                    </section>
                ))}
            </div>
        </section>
    );
}
