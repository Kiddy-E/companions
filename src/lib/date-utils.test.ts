import { describe, it, expect } from "vitest";
import { differenceInYears, differenceInMonths } from "./date-utils";

describe("differenceInYears", () => {
  it("calculates full years correctly", () => {
    const born = new Date("2020-01-15");
    const now = new Date("2025-01-15");
    expect(differenceInYears(now, born)).toBe(5);
  });

  it("doesn't count year before birthday", () => {
    const born = new Date("2020-06-15");
    const now = new Date("2025-06-14");
    expect(differenceInYears(now, born)).toBe(4);
  });

  it("counts year on exact birthday", () => {
    const born = new Date("2020-06-15");
    const now = new Date("2025-06-15");
    expect(differenceInYears(now, born)).toBe(5);
  });
});

describe("differenceInMonths", () => {
  it("calculates months across years", () => {
    const a = new Date("2025-03-01");
    const b = new Date("2024-01-01");
    expect(differenceInMonths(a, b)).toBe(14);
  });

  it("returns 0 for same month", () => {
    const a = new Date("2025-03-10");
    const b = new Date("2025-03-01");
    expect(differenceInMonths(a, b)).toBe(0);
  });
});
