import React from "react";
import { render, screen } from "@testing-library/react";

import StandingsOrderBoard from "../StandingsOrderBoard";

describe("StandingsOrderBoard", () => {
  test("renders a locked conference order with scoring context", () => {
    render(
      <StandingsOrderBoard
        points={4}
        maxPoints={90}
        predictions={[
          { team: "Boston Celtics", conference: "East", predicted_position: 1, actual_position: 2, points: 1 },
          { team: "Denver Nuggets", conference: "West", predicted_position: 1, actual_position: 1, points: 3 },
        ]}
      />,
    );

    expect(screen.getByText("Locked team order")).toBeInTheDocument();
    expect(screen.getByText("Eastern Conference")).toBeInTheDocument();
    expect(screen.getByText("Western Conference")).toBeInTheDocument();
    expect(screen.getByText("Boston Celtics")).toBeInTheDocument();
    expect(screen.getByText("Denver Nuggets")).toBeInTheDocument();
  });
});
