import React from "react";
import { LayoutDashboard, Trophy, Target, Edit2, Settings } from "lucide-react";

export default function ProfileTabs({ activeTab, setActiveTab, canEdit }) {
    const tabs = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "standings", label: "Standings", icon: Trophy },
        { id: "questions", label: "Questions", icon: Target },
        ...(canEdit ? [{ id: "submissions", label: "Submissions", icon: Edit2 }] : []),
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <nav className="court-profile-tabs" aria-label="Profile sections">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={activeTab === t.id ? "is-active" : ""}
                        aria-current={activeTab === t.id ? "page" : undefined}
                    >
                        <t.icon /><span>{t.label}</span>
                    </button>
                ))}
        </nav>
    );
}
