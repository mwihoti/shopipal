const bookFields = `id title handle description onlineStoreUrl featuredImage { url altText }`;
const variantFields = `id title availableForSale price { amount currencyCode }`;
export const STORE_BOOKS = `query StoreBooks($query: String!) {
  products(first: 30, query: $query) { nodes {
    ${bookFields}
    variants(first: 10) { nodes { ${variantFields} } }
  } pageInfo { hasNextPage } }
}`;
export const STORE_BOOK = `query StoreBook($id: ID!) {
  node(id: $id) { ... on ProductVariant {
    ${variantFields}
    product { ${bookFields} }
  } }
}`;
export const STORE_CART = `mutation StoreCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart { checkoutUrl totalQuantity lines(first: 2) { nodes {
      quantity merchandise { ... on ProductVariant { id } }
    } } }
    userErrors { message }
    warnings { message }
  }
}`;
