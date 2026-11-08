import { Storefront } from "@/components/Storefront";
import { catalogPreviewMode } from "@/lib/database-config";
export default function Home() {
  return <Storefront previewMode={catalogPreviewMode()} />;
}
