export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export function commission(cents: number, bps: number) { return Math.floor(cents * bps / 10000); }
export function decimal(cents: number) { return (cents / 100).toFixed(2); }
export function withinBudget(cents: number, budget: number, cap: number) { return Number.isSafeInteger(cents) && cents > 0 && cents <= budget && cents <= cap; }
