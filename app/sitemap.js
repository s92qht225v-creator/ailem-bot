import { getAllProductIds } from '../src/lib/data';

export default async function sitemap() {
  const baseUrl = 'https://www.ailem.uz';

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/cart`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  // Dynamic product pages
  let productPages = [];
  try {
    const productIds = await getAllProductIds();
    productPages = productIds.map((id) => ({
      url: `${baseUrl}/product/${id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
  } catch {
    // If DB fetch fails, return only static pages
  }

  return [...staticPages, ...productPages];
}
