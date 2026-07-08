import { getEssentialData, getAppSettings } from '../../src/lib/data';
import HomePageClient from '../../src/components/pages/HomePageClient';
import { getTotalVariantStock } from '../../src/utils/variants';

export const metadata = {
  title: "Ailem — Uy tekstillari do'koni | ailem.uz",
  description: "Toshkentdagi eng yaxshi choyshab, yostiq va pardalar do'koni. Tez yetkazib berish, qulay narxlar.",
};

export default async function HomePage() {
  let ssrProducts = [];
  let ssrCategories = [];
  let ssrBanners = [];
  let ssrSaleTimer = null;

  try {
    const [essentialData, appSettings] = await Promise.all([
      getEssentialData({ lightweight: true }),
      getAppSettings(),
    ]);

    ssrProducts = essentialData.products.filter((product) => {
      const hasVariants = product.variants && product.variants.length > 0;
      const stock = hasVariants ? getTotalVariantStock(product.variants) : (product.stock || 0);
      return product.visible !== false && stock > 0;
    });
    ssrCategories = essentialData.categories.filter(c => c.visible !== false);
    ssrBanners = appSettings.banners || [];
    ssrSaleTimer = appSettings.sale_timer;
  } catch (error) {
    // Fall back to client-side fetching
  }

  // Take top 12 products for featured section
  const featuredProducts = ssrProducts.slice(0, 12);

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Ailem',
    url: 'https://www.ailem.uz',
    description: "Toshkentdagi eng yaxshi choyshab, yostiq va pardalar do'koni. Tez yetkazib berish, qulay narxlar.",
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://www.ailem.uz/shop?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  const productListJsonLd = featuredProducts.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Eng ko\'p sotilganlar',
    numberOfItems: featuredProducts.length,
    itemListElement: featuredProducts.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        image: product.image,
        url: `https://www.ailem.uz/product/${product.id}`,
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'UZS',
          availability: 'https://schema.org/InStock',
        },
        ...(product.reviews && product.reviews.length > 0 ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length).toFixed(1),
            reviewCount: product.reviews.length,
          },
        } : {}),
      },
    })),
  } : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {productListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productListJsonLd) }}
        />
      )}
      <HomePageClient
        ssrProducts={featuredProducts}
        ssrCategories={ssrCategories}
        ssrBanners={ssrBanners}
        ssrSaleTimer={ssrSaleTimer}
      />
    </>
  );
}
