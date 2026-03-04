export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/payment', '/checkout', '/api/'],
      },
    ],
    sitemap: 'https://www.ailem.uz/sitemap.xml',
  };
}
