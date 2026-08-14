import React from "react";
import { Crown, Zap, BarChart3, Target } from "lucide-react";

export default function ProfileStats({ me, data, standings, awards, props }) {
    return (
        <section className="court-profile-score-strip" aria-label="Season score summary">
            {[
                { label: "Rank", value: me?.rank ? `#${me.rank}` : "—", sub: `${data?.length || 0} players`, icon: Crown, color: "text-amber-400", bg: "from-amber-500/10 to-orange-500/5" },
                { label: "Total Points", value: me?.user?.total_points?.toLocaleString() || "0", sub: "All categories", icon: Zap },
                { label: "Standings", value: standings.points || 0, sub: `of ${standings.max_points || 0}`, icon: BarChart3 },
                { label: "Awards + Props", value: (awards.points || 0) + (props.points || 0), sub: `of ${(awards.max_points || 0) + (props.max_points || 0)}`, icon: Target },
            ].map((stat, i) => (
                <div key={i} className="court-profile-score"><stat.icon /><span>{stat.label}</span><strong>{stat.value}</strong><small>{stat.sub}</small></div>
            ))}
        </section>
    );
}
