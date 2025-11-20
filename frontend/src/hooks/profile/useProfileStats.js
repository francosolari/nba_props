import { useState, useEffect } from "react";
import axios from "axios";

export default function useProfileStats(selectedSeason, username, meUsername) {
    const [interestingStats, setInterestingStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!username && !meUsername) return;

                setStatsLoading(true);
                const res = await axios.get(
                    `/api/v2/homepage/interesting-stats/${encodeURIComponent(username || meUsername || "")}`,
                    {
                        params: { season_slug: selectedSeason },
                    },
                );
                if (mounted) setInterestingStats(res.data);
            } catch (err) {
                if (mounted) setInterestingStats(null);
            } finally {
                if (mounted) setStatsLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [selectedSeason, username, meUsername]);

    return { interestingStats, statsLoading };
}
