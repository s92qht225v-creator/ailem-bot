// Image proxy to hide Supabase URLs from Telegram's long-press menu
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Only allow Supabase URLs
    const decodedUrl = decodeURIComponent(url);
    if (!decodedUrl.includes('supabase.co')) {
      return res.status(403).json({ error: 'Invalid image source' });
    }

    const response = await fetch(decodedUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
}
