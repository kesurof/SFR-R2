import { describe, expect, it } from "vitest";
import { accountCreatedAt, formatAge } from "../lib/member-age";

describe("accountCreatedAt", () => {
  it("décode le snowflake Discord en date de création", () => {
    // Snowflake synthétique correspondant à une date de création en 2016.
    const d = accountCreatedAt("250000000000000001");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getUTCFullYear()).toBe(2016);
  });
  it("refuse une valeur qui n'est pas un snowflake", () => {
    expect(accountCreatedAt("pas-un-id")).toBeNull();
    expect(accountCreatedAt("123")).toBeNull();
  });
});

describe("formatAge", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("gère l'absence de date", () => {
    expect(formatAge(null, now)).toBe("—");
    expect(formatAge(undefined, now)).toBe("—");
  });
  it("jours, mois, années", () => {
    expect(formatAge(new Date("2025-12-20T00:00:00Z"), now)).toBe("12 j");
    expect(formatAge(new Date("2025-09-01T00:00:00Z"), now)).toBe("4 mois");
    expect(formatAge(new Date("2024-06-01T00:00:00Z"), now)).toBe("1 an");
    expect(formatAge(new Date("2021-01-01T00:00:00Z"), now)).toBe("5 ans");
  });
  it("date future → —", () => {
    expect(formatAge(new Date("2027-01-01T00:00:00Z"), now)).toBe("—");
  });
});
