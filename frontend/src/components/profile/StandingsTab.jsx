import React from "react";
import StandingsOrderBoard from "../StandingsOrderBoard";

export default function StandingsTab({ standings }) {
    return (
        <StandingsOrderBoard
            predictions={standings?.predictions || []}
            points={standings?.points || 0}
            maxPoints={standings?.max_points || 0}
        />
    );
}
