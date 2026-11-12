export const STORE_DOMAIN = "pdf-color-games.myshopify.com";
export const STORE_URL = `https://${STORE_DOMAIN}`;
export type StoreBook = {
  variantId: string;
  title: string;
  variantTitle: string;
  description: string;
  image: string | null;
  productUrl: string;
  amount: string;
  currency: string;
};
export const storeMoney = (book: Pick<StoreBook, "amount" | "currency">) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: book.currency,
    currencyDisplay: "code",
  }).format(Number(book.amount));
