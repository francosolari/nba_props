import React from "react";
import { ChevronDown, Trophy } from "lucide-react";

export default function ProfileHero({ me, seasons, selectedSeason, onSeasonChange }) {
    const name = me?.user?.display_name || me?.user?.username || "Player";
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
    return (
        <header className="court-profile-hero">
            <div className="court-profile-stripe"><span>Official season scorebook</span><span>Player file</span></div>
            <div className="court-profile-hero__body">
                <div className="court-profile-hero__inner">
                    <div className="court-profile-identity">
                        <div className="court-profile-primary">
                            <div className="court-profile-monogram" aria-hidden="true">{initials || "P"}</div>
                            <div className="court-profile-copy">
                                <span className="court-kicker">Season participant</span>
                                <h1>{name}</h1>
                                <p>@{me?.user?.username} <span>•</span> picks locked to the official ledger</p>
                            </div>
                        </div>
                        <div className="court-profile-meta">
                            <div className="court-profile-rank-stamp">
                                <Trophy />
                                <div><span>Current rank</span><strong>#{me?.rank || "—"}</strong></div>
                            </div>
                            <label className="court-season-select">
                                <span>Season</span>
                                <select
                                    value={selectedSeason}
                                    onChange={(e) => onSeasonChange(e.target.value)}
                                >
                                    {seasons.map((s) => (
                                        <option key={s.slug} value={s.slug}>
                                            {s.slug}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
