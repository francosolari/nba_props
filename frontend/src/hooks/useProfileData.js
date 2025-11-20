import { useState, useEffect, useMemo } from "react";
import axios from "axios";

function getRootProps() {
    const el = document.getElementById("profile-root");
    return {
        userId: el?.getAttribute("data-user-id") || "",
        username: el?.getAttribute("data-username") || "",
        displayName: el?.getAttribute("data-display-name") || "",
        seasonSlug: el?.getAttribute("data-season-slug") || "current",
        seasonsCsv: el?.getAttribute("data-seasons") || "",
    };
}

export default function useProfileData(seasonFromProp) {
    const { userId, username, displayName, seasonSlug, seasonsCsv } = getRootProps();
    const initialSeason = seasonFromProp || seasonSlug || "current";
    const [selectedSeason, setSelectedSeason] = useState(initialSeason);
    const [seasons, setSeasons] = useState(() =>
        seasonsCsv
            ? seasonsCsv
                .split(",")
                .filter(Boolean)
                .map((slug) => ({ slug }))
            : [{ slug: initialSeason }],
    );

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await axios.get("/api/v2/seasons/");
                if (mounted && Array.isArray(res.data) && res.data.length) {
                    setSeasons(res.data);
                    if (!res.data.find((s) => s.slug === selectedSeason)) {
                        setSelectedSeason(res.data[0].slug);
                    }
                }
            } catch (_) {
                // Fallback silently
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const selectedSeasonObj = seasons.find((s) => s.slug === selectedSeason) || {};

    const canEdit = useMemo(() => {
        try {
            const now = new Date();
            const start = selectedSeasonObj.submission_start_date
                ? new Date(selectedSeasonObj.submission_start_date)
                : null;
            const end = selectedSeasonObj.submission_end_date
                ? new Date(selectedSeasonObj.submission_end_date)
                : null;
            if (!end) return false;
            if (start && now < start) return false;
            return now <= end;
        } catch (_) {
            return false;
        }
    }, [selectedSeasonObj]);

    return {
        userId,
        username,
        displayName,
        selectedSeason,
        setSelectedSeason,
        seasons,
        selectedSeasonObj,
        canEdit
    };
}
