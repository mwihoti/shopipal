import { Storefront } from "@/components/Storefront";
export default function Home() {
  return (
    <Storefront
      previewMode={!!process.env.VERCEL && !process.env.DATABASE_URL}
    />
  );
}
