import React from "react";
import { render, screen } from "@testing-library/react";

import DashboardTab from "../DashboardTab";

const category = {
  points: 0,
  max_points: 0,
  predictions: [],
};

describe("DashboardTab", () => {
  test("renders the initial profile state before interesting stats load", () => {
    render(
      <DashboardTab
        standings={category}
        awards={category}
        props={category}
        answers={[]}
        interestingStats={null}
        statsLoading={false}
        setActiveTab={jest.fn()}
        compareHref="/leaderboard/current/detailed/"
      />,
    );

    expect(screen.getByText("Recent calls")).toBeInTheDocument();
    expect(screen.getByText("No calls recorded for this season.")).toBeInTheDocument();
    expect(screen.getByText(/Not enough results yet/)).toBeInTheDocument();
  });
});
