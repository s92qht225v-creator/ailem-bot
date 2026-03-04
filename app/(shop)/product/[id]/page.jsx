import { getProductById } from '../../../../src/lib/data';
import ProductPageClient from '../../../../src/components/pages/ProductPageClient';

export async function generateMetadata({ params }) {
  const product = await getProductById(params.id);

  if (!product) {
    return { title: 'Mahsulot topilmadi — Ailem' };
  }

  return {
    title: `${product.name} — Ailem`,
    description: product.description
      ? product.description.substring(0, 160)
      : `${product.name} — sifatli uy tekstil mahsulotlari. Ailem do'konida xarid qiling.`,
    openGraph: {
      title: `${product.name} — Ailem`,
      description: product.description
        ? product.description.substring(0, 160)
        : `${product.name} — Ailem do'konida`,
      images: product.image ? [{ url: product.image }] : [],
    },
  };
}

export default function ProductPage({ params }) {
  return <ProductPageClient productId={params.id} />;
}
