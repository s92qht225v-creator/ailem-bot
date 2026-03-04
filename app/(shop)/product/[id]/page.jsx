import { getProductById } from '../../../../src/lib/data';
import ProductPageClient from '../../../../src/components/pages/ProductPageClient';

function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

export async function generateMetadata({ params }) {
  const product = await getProductById(params.id);

  if (!product) {
    return { title: 'Mahsulot topilmadi — Ailem' };
  }

  const plainDesc = product.description
    ? stripHtml(product.description).substring(0, 160)
    : `${product.name} — sifatli uy tekstil mahsulotlari. Ailem do'konida xarid qiling.`;

  return {
    title: `${product.name} — Ailem`,
    description: plainDesc,
    openGraph: {
      title: `${product.name} — Ailem`,
      description: plainDesc,
      images: product.image ? [{ url: product.image }] : [],
    },
  };
}

export default function ProductPage({ params }) {
  return <ProductPageClient productId={params.id} />;
}
