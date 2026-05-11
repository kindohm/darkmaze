import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { resetDebuffs, applyDebuff, isDebuffed, canMove } from "./debuff.js";

describe("debuff", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDebuffs();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("applyDebuff", () => {
    it("marks player as debuffed", () => {
      applyDebuff("p1");
      expect(isDebuffed("p1")).toBe(true);
    });
  });

  describe("isDebuffed", () => {
    it("returns false for non-debuffed player", () => {
      expect(isDebuffed("p1")).toBe(false);
    });

    it("returns false after debuff expires", () => {
      applyDebuff("p1");
      vi.advanceTimersByTime(20_001);
      expect(isDebuffed("p1")).toBe(false);
    });

    it("returns true during debuff duration", () => {
      applyDebuff("p1");
      vi.advanceTimersByTime(10_000);
      expect(isDebuffed("p1")).toBe(true);
    });
  });

  describe("canMove", () => {
    it("allows first move always", () => {
      expect(canMove("p1")).toBe(true);
    });

    it("blocks rapid moves for normal player", () => {
      canMove("p1"); // first move
      expect(canMove("p1")).toBe(false); // too fast
    });

    it("allows move after interval for normal player", () => {
      canMove("p1");
      vi.advanceTimersByTime(121);
      expect(canMove("p1")).toBe(true);
    });

    it("requires double interval when debuffed", () => {
      applyDebuff("p1");
      canMove("p1"); // first move
      vi.advanceTimersByTime(121); // normal interval
      expect(canMove("p1")).toBe(false); // still blocked
      vi.advanceTimersByTime(120); // total 241ms > 240ms
      expect(canMove("p1")).toBe(true);
    });
  });
});
