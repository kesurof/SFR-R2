import { describe, expect, it } from "vitest";
import { createNonce } from "../proxy";

describe("CSP nonce", () => {
  it("génère des valeurs aléatoires compatibles CSP", () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(b);
  });
});
