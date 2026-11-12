import photos from "../../data/product-photos.json";
const byId = new Map(photos.map((photo) => [photo.id, photo]));
export const productPhoto = (id: string) => byId.get(id);
export function withProductPhoto<T extends { id: string; image: string }>(
  product: T,
): T {
  const photo = productPhoto(product.id);
  return photo && product.image === `/products/${product.id}.svg`
    ? { ...product, image: photo.image }
    : product;
}
