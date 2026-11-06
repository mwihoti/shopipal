import { describe, it, expect } from "vitest";
import { commission, withinBudget, decimal } from "../src/lib/money";
import { capCents } from "../src/lib/config";
describe("purchase limits", () => {
  it("uses cents at exact boundaries", () => {
    expect(withinBudget(8000, 8000, 8000)).toBe(true);
    expect(withinBudget(8001, 9000, 8000)).toBe(false);
    expect(withinBudget(7400, 7300, 8000)).toBe(false);
    expect(withinBudget(-1, 8000, 8000)).toBe(false);
    expect(withinBudget(7.4, 8000, 8000)).toBe(false);
  });
  it("calculates commission without floating point dollars", () => {
    expect(commission(7400, 1500)).toBe(1110);
    expect(commission(7999, 1500)).toBe(1199);
    expect(decimal(7400)).toBe("74.00");
  });
  it("does not allow configuration to raise the hard cap", () => {
    const previous = process.env.SPENDING_CAP_USD;
    process.env.SPENDING_CAP_USD = "100";
    expect(() => capCents()).toThrow();
    if (previous === undefined) delete process.env.SPENDING_CAP_USD;
    else process.env.SPENDING_CAP_USD = previous;
  });
});
