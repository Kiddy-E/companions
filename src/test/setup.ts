import "@testing-library/jest-dom";
import { vi } from "vitest";

// Prevent db module from trying to connect during unit tests
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.SESSION_SECRET = "test-secret-that-is-long-enough-for-zod-32chars";
// NODE_ENV is read-only in some TS configs; set via env before import instead

// Mock the db singleton — unit tests should not hit a real database
vi.mock("@/lib/db", () => ({
  db: {
    user: { count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    apiToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pet: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    event: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), groupBy: vi.fn(), update: vi.fn(), delete: vi.fn() },
    vaccine: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));
