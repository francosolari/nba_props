import { useState, useEffect } from "react";
import axios from "axios";

export default function useProfileAnswers(activeTab, selectedSeason, username, meUsername) {
    const [answers, setAnswers] = useState([]);
    const [categories, setCategories] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (activeTab !== "questions" && activeTab !== "dashboard") return;
                const res = await axios.get(
                    `/api/v2/answers/user/${encodeURIComponent(username || meUsername || "")}`,
                    {
                        params: { season_slug: selectedSeason, resolve_names: true },
                    },
                );
                if (mounted) {
                    setAnswers(Array.isArray(res.data?.answers) ? res.data.answers : []);
                    setCategories(res.data?.categories || null);
                }
            } catch (_) {
                if (mounted) {
                    setAnswers([]);
                    setCategories(null);
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, [activeTab, selectedSeason, username, meUsername]);

    return { answers, categories };
}
