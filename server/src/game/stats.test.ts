import { describe, it, expect, beforeEach } from "vitest";
import {
  resetStats,
  getStats,
  initPlayerStats,
  recordStep,
  calcDistance,
} from "./stats.js";

describe("stats", () => {
  beforeEach(() => {
    resetStats();
  });

  describe("calcDistance", () => {
    it("returns manhattan distance between two positions", () => {
      expect(calcDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
    });

    it("returns 0 for same position", () => {
      expect(calcDistance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
    });

    it("handles negative deltas", () => {
      expect(calcDistance({ x: 10, y: 10 }, { x: 3, y: 2 })).toBe(15);
    });
  });

  describe("initPlayerStats", () => {
    it("creates stats with zero steps and initial distance", () => {
      initPlayerStats("p1", { x: 0, y: 0 }, { x: 10, y: 10 });
      const stats = getStats();
      expect(stats["p1"]).toEqual({
        stepsTaken: 0,
        closestDistanceToGoal: 20,
      });
    });

    it("initializes multiple players independently", () => {
      initPlayerStats("p1", { x: 0, y: 0 }, { x: 5, y: 5 });
      initPlayerStats("p2", { x: 1, y: 1 }, { x: 5, y: 5 });
      const stats = getStats();
      expect(stats["p1"].closestDistanceToGoal).toBe(10);
      expect(stats["p2"].closestDistanceToGoal).toBe(8);
    });
  });

  describe("recordStep", () => {
    it("increments step count", () => {
      initPlayerStats("p1", { x: 0, y: 0 }, { x: 10, y: 10 });
      recordStep("p1", { x: 1, y: 0 }, { x: 10, y: 10 });
      recordStep("p1", { x: 2, y: 0 }, { x: 10, y: 10 });
      expect(getStats()["p1"].stepsTaken).toBe(2);
    });

    it("tracks closest distance when getting closer", () => {
      const goal = { x: 10, y: 10 };
      initPlayerStats("p1", { x: 0, y: 0 }, goal);
      recordStep("p1", { x: 5, y: 5 }, goal); // dist = 10
      expect(getStats()["p1"].closestDistanceToGoal).toBe(10);
    });

    it("does not increase closest distance when moving away", () => {
      const goal = { x: 10, y: 10 };
      initPlayerStats("p1", { x: 5, y: 5 }, goal); // dist = 10
      recordStep("p1", { x: 8, y: 8 }, goal); // dist = 4
      recordStep("p1", { x: 0, y: 0 }, goal); // dist = 20, but closest stays 4
      expect(getStats()["p1"].closestDistanceToGoal).toBe(4);
    });

    it("does nothing for unknown player", () => {
      recordStep("unknown", { x: 1, y: 1 }, { x: 10, y: 10 });
      expect(getStats()["unknown"]).toBeUndefined();
    });
  });

  describe("resetStats", () => {
    it("clears all player stats", () => {
      initPlayerStats("p1", { x: 0, y: 0 }, { x: 10, y: 10 });
      resetStats();
      expect(getStats()).toEqual({});
    });
  });
});
