/**
 * What-If simulation hook for standings predictions
 *
 * Manages What-If mode state, conference team orderings, and simulated
 * point calculations based on user-defined standings.
 *
 * @module features/leaderboard/hooks/useWhatIfSimulation
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  LeaderboardEntry,
  OrderedTeam,
  StandingsTeam,
} from '../types/leaderboard';
import {
  calculateSimulatedTotals,
  reorderList,
} from '../utils/standings';
import type { DraggableLocation } from 'react-beautiful-dnd';

/**
 * Result of onDragEnd handler
 */
export interface DragEndResult {
  destination: DraggableLocation | null | undefined;
  source: DraggableLocation;
}

/**
 * State returned by useWhatIfSimulation hook
 */
export interface WhatIfSimulationState {
  /** Ordered teams for Western Conference */
  westOrder: OrderedTeam[];

  /** Ordered teams for Eastern Conference */
  eastOrder: OrderedTeam[];

  /** Set Western Conference order */
  setWestOrder: React.Dispatch<React.SetStateAction<OrderedTeam[]>>;

  /** Set Eastern Conference order */
  setEastOrder: React.Dispatch<React.SetStateAction<OrderedTeam[]>>;

  /** Map of team name to simulated position */
  simActualMap: Map<string, number>;

  /** Leaderboard data with simulated totals (if What-If enabled) */
  withSimTotals: LeaderboardEntry[];

  /** Handle drag-and-drop reordering */
  onDragEnd: (result: DragEndResult) => void;

  /** Reset orders to actual standings */
  resetOrders: () => void;
}

/**
 * Options for initializing What-If simulation
 */
export interface WhatIfSimulationOptions {
  /** Whether What-If mode is currently enabled */
  whatIfEnabled: boolean;

  /** All standings teams with actual positions */
  standingsTeams: StandingsTeam[];

  /** Current leaderboard data */
  leaderboardData: LeaderboardEntry[];

  /** Callback when What-If confirmation is needed */
  onShowWhatIfConfirm?: () => void;
}

/**
 * What-If simulation hook for standings predictions
 *
 * Manages the What-If mode where users can drag teams to simulate different
 * standings and see how it would affect user points.
 *
 * Features:
 * - Drag-and-drop reordering of teams per conference
 * - Automatic recalculation of user points based on simulated positions
 * - Initialization from actual standings when What-If is disabled
 *
 * @param options - Simulation options
 * @returns What-If simulation state and actions
 *
 * @example
 * ```tsx
 * const simulation = useWhatIfSimulation({
 *   whatIfEnabled: true,
 *   standingsTeams: teams,
 *   leaderboardData: entries,
 *   onShowWhatIfConfirm: () => setShowConfirm(true)
 * });
 *
 * // Use in DragDropContext
 * <DragDropContext onDragEnd={simulation.onDragEnd}>
 *   <Droppable droppableId="west">
 *     {simulation.westOrder.map((team, idx) => ...)}
 *   </Droppable>
 * </DragDropContext>
 *
 * // Display simulated leaderboard
 * {simulation.withSimTotals.map(entry => ...)}
 * ```
 */
export function useWhatIfSimulation(
  options: WhatIfSimulationOptions
): WhatIfSimulationState {
  const {
    whatIfEnabled,
    standingsTeams,
    leaderboardData,
    onShowWhatIfConfirm,
  } = options;

  const [westOrder, setWestOrder] = useState<OrderedTeam[]>([]);
  const [eastOrder, setEastOrder] = useState<OrderedTeam[]>([]);

  // Initialize orders from actual standings when What-If is off and orders are empty
  useEffect(() => {
    if (whatIfEnabled) return;
    if (westOrder.length > 0 || eastOrder.length > 0) return;
    if (!standingsTeams || standingsTeams.length === 0) return;

    const west = standingsTeams
      .filter((r) => (r.conference || '').toLowerCase().startsWith('w'))
      .sort((a, b) => (a.actual_position || 999) - (b.actual_position || 999))
      .map((r) => ({
        id: `W-${r.team}`,
        team: r.team,
        conference: 'West' as const,
        actual_position: r.actual_position || null,
      }));

    const east = standingsTeams
      .filter((r) => (r.conference || '').toLowerCase().startsWith('e'))
      .sort((a, b) => (a.actual_position || 999) - (b.actual_position || 999))
      .map((r) => ({
        id: `E-${r.team}`,
        team: r.team,
        conference: 'East' as const,
        actual_position: r.actual_position || null,
      }));

    setWestOrder(west);
    setEastOrder(east);
  }, [standingsTeams, whatIfEnabled, westOrder.length, eastOrder.length]);

  // Build map of team -> simulated position
  const simActualMap = useMemo(() => {
    const map = new Map<string, number>();
    westOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    eastOrder.forEach((it, idx) => map.set(it.team, idx + 1));
    return map;
  }, [westOrder, eastOrder]);

  // Calculate leaderboard with simulated totals
  const withSimTotals = useMemo(() => {
    if (!leaderboardData) return [];
    if (!whatIfEnabled) return leaderboardData;

    return calculateSimulatedTotals(leaderboardData, westOrder, eastOrder);
  }, [leaderboardData, whatIfEnabled, westOrder, eastOrder]);

  // Handle drag-and-drop reordering
  const onDragEnd = useCallback(
    (result: DragEndResult) => {
      const { destination, source } = result;
      if (!destination) return;

      // If What-If is not enabled, show confirmation modal
      if (!whatIfEnabled) {
        onShowWhatIfConfirm?.();
        return;
      }

      // Only handle drops within the same conference
      if (source.droppableId === destination.droppableId) {
        if (source.droppableId === 'west') {
          setWestOrder((prev) => reorderList(prev, source.index, destination.index));
        }
        if (source.droppableId === 'east') {
          setEastOrder((prev) => reorderList(prev, source.index, destination.index));
        }
      }
    },
    [whatIfEnabled, onShowWhatIfConfirm]
  );

  // Reset orders to actual standings
  const resetOrders = useCallback(() => {
    if (!standingsTeams || standingsTeams.length === 0) return;

    const west = standingsTeams
      .filter((r) => (r.conference || '').toLowerCase().startsWith('w'))
      .sort((a, b) => (a.actual_position || 999) - (b.actual_position || 999))
      .map((r) => ({
        id: `W-${r.team}`,
        team: r.team,
        conference: 'West' as const,
        actual_position: r.actual_position || null,
      }));

    const east = standingsTeams
      .filter((r) => (r.conference || '').toLowerCase().startsWith('e'))
      .sort((a, b) => (a.actual_position || 999) - (b.actual_position || 999))
      .map((r) => ({
        id: `E-${r.team}`,
        team: r.team,
        conference: 'East' as const,
        actual_position: r.actual_position || null,
      }));

    setWestOrder(west);
    setEastOrder(east);
  }, [standingsTeams]);

  return {
    westOrder,
    eastOrder,
    setWestOrder,
    setEastOrder,
    simActualMap,
    withSimTotals,
    onDragEnd,
    resetOrders,
  };
}
