import React from "react";
import { Gauge, Zap, BarChart3, Target } from "lucide-react";
import { ScorebookNumber, ScorebookTable } from "../scorebook/ScorebookPrimitives";

export default function ProfileStats({ me, standings, awards, props }) {
    const accuracy = Number(me?.user?.accuracy || 0);
    return (
        <ScorebookTable className="court-profile-score-strip" aria-label="Season score summary">
            {[
                { label: "Accuracy", value: `${Math.round(accuracy)}%`, sub: "Resolved calls", icon: Gauge },
                { label: "Total Points", value: me?.user?.total_points?.toLocaleString() || "0", sub: "All categories", icon: Zap },
                { label: "Standings", value: standings.points || 0, sub: `of ${standings.max_points || 0}`, icon: BarChart3 },
                { label: "Awards + Props", value: (awards.points || 0) + (props.points || 0), sub: `of ${(awards.max_points || 0) + (props.max_points || 0)}`, icon: Target },
            ].map((stat, i) => (
                <div key={i} className="court-profile-score"><stat.icon /><span>{stat.label}</span><ScorebookNumber>{stat.value}</ScorebookNumber><small>{stat.sub}</small></div>
            ))}
        </ScorebookTable>
    );
}
