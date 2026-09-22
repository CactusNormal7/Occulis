import { describe, expect, it } from "vitest";
import { FIRST_RETRY_MS, MAX_RETRY_MS, retryDelay } from "./backoff.js";

describe("retryDelay", () => {
  it("commence court et double à chaque tentative", () => {
    expect(retryDelay(1)).toBe(FIRST_RETRY_MS);
    expect(retryDelay(2)).toBe(FIRST_RETRY_MS * 2);
    expect(retryDelay(3)).toBe(FIRST_RETRY_MS * 4);
  });

  it("plafonne, pour qu'une coupure longue n'éloigne pas indéfiniment la reprise", () => {
    expect(retryDelay(20)).toBe(MAX_RETRY_MS);
    expect(retryDelay(200)).toBe(MAX_RETRY_MS);
  });

  it("reste défini pour une tentative absurde", () => {
    expect(retryDelay(0)).toBe(FIRST_RETRY_MS);
    expect(retryDelay(-3)).toBe(FIRST_RETRY_MS);
  });
});
