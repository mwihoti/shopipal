export type MarketProduct = {
  id: string;
  title: string;
  image?: string;
  retailer: string;
  url: string;
  priceCents: number;
  currency: "USD";
};

export function publicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.hostname.includes(".") &&
      !url.hostname.endsWith(".local") &&
      !url.hostname.endsWith(".localhost") &&
      !/^[\d.]+$/.test(url.hostname) &&
      !url.hostname.includes(":")
    );
  } catch {
    return false;
  }
}
