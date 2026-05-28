import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hashes a password and verifies it correctly", async () => {
    const password = "super-secret-password-123";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$argon2id/);

    const valid = await verifyPassword(hash, password);
    expect(valid).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct-password-long");
    const valid = await verifyPassword(hash, "wrong-password-long");
    expect(valid).toBe(false);
  });

  it("produces different hashes for same password (salted)", async () => {
    const password = "same-password-every-time";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });

  it("returns false for garbage hash without throwing", async () => {
    const valid = await verifyPassword("not-a-valid-hash", "password");
    expect(valid).toBe(false);
  });
});
