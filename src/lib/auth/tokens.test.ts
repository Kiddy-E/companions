import { describe, it, expect } from "vitest";
import { hasScope, ALL_SCOPES } from "./tokens";

describe("hasScope", () => {
  it("returns true when scope is present", () => {
    expect(hasScope(["events:read", "pets:read"], "events:read")).toBe(true);
  });

  it("returns false when scope is missing", () => {
    expect(hasScope(["events:read"], "events:write")).toBe(false);
  });

  it("returns false for empty scopes array", () => {
    expect(hasScope([], "pets:read")).toBe(false);
  });

  it("ALL_SCOPES contains expected resource/action pairs", () => {
    const expected = [
      "pets:read", "pets:write",
      "events:read", "events:write",
      "vaccines:read", "vaccines:write",
    ];
    expected.forEach((s) => expect(ALL_SCOPES).toContain(s));
  });
});
