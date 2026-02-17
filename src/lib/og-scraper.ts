/** Lightweight Open Graph metadata scraper (client-side). */

export interface OGMetadata {
  title: string;
  image: string | null;
  description: string | null;
  siteName: string | null;
}

/**
 * Attempt to fetch Open Graph metadata from a URL.
 * Falls back gracefully — returns partial data or nulls if the fetch fails
 * (CORS, timeout, non-HTML response, etc.).
 */
export async function fetchOGMetadata(url: string): Promise<OGMetadata> {
  const fallback: OGMetadata = {
    title: '',
    image: null,
    description: null,
    siteName: null,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Fitfiles/1.0 (link preview)' },
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) return fallback;

    const html = await res.text();

    const getMetaContent = (property: string): string | null => {
      // Match <meta property="og:..." content="..."> or <meta name="..." content="...">
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
        'i',
      );
      const match = html.match(regex);
      if (match) return match[1];

      // Also try reversed attribute order: content before property
      const regex2 = new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        'i',
      );
      const match2 = html.match(regex2);
      return match2 ? match2[1] : null;
    };

    const ogTitle = getMetaContent('og:title');
    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleFromTag = titleTagMatch ? titleTagMatch[1].trim() : '';

    return {
      title: ogTitle ?? titleFromTag,
      image: getMetaContent('og:image'),
      description: getMetaContent('og:description') ?? getMetaContent('description'),
      siteName: getMetaContent('og:site_name'),
    };
  } catch {
    return fallback;
  }
}

/** Extract the domain from a URL string. */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
