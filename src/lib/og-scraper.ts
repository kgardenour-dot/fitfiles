/** Lightweight Open Graph metadata scraper (client-side). */

export interface OGMetadata {
  title: string;
  image: string | null;
  description: string | null;
  siteName: string | null;
}

export interface UrlMetadata {
  title: string;
  thumbnail_url: string | null;
  source_domain: string;
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
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FitLinks/1.0 (link preview)' },
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
    const twitterTitle = getMetaContent('twitter:title');
    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleFromTag = titleTagMatch ? titleTagMatch[1].trim() : '';

    return {
      title: ogTitle ?? twitterTitle ?? titleFromTag,
      image: getMetaContent('og:image'),
      description: getMetaContent('og:description') ?? getMetaContent('description'),
      siteName: getMetaContent('og:site_name'),
    };
  } catch {
    return fallback;
  }
}

const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'youtu.be'];

export function extractYoutubeVideoId(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return id || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return v;
      const m = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (m) return m[1];
      const vMatch = u.pathname.match(/^\/v\/([^/?]+)/);
      if (vMatch) return vMatch[1];
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Canonicalize YouTube URLs to https://www.youtube.com/watch?v=<videoId>
 * so the same video from different formats (youtu.be, m.youtube.com, embed, etc.)
 * maps to a single stored URL and avoids duplicates.
 */
export function canonicalizeUrl(url: string): string {
  const videoId = extractYoutubeVideoId(url);
  if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
  return url;
}

async function fetchYoutubeMetadata(url: string): Promise<UrlMetadata | null> {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FitLinks/1.0 (link preview)' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json() as { title?: string; thumbnail_url?: string };
    return {
      title: typeof data.title === 'string' ? data.title : '',
      thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      source_domain: 'youtube.com',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch title, thumbnail, and domain from a URL.
 * Best-effort: returns partial data or empty strings on failure.
 * Uses YouTube oEmbed for youtube.com/youtu.be URLs to avoid "Google Search" titles.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const domain = extractDomain(url);
  const fallback: UrlMetadata = {
    title: '',
    thumbnail_url: null,
    source_domain: domain,
  };

  try {
    const hostname = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })();

    if (YOUTUBE_HOSTS.includes(hostname)) {
      const yt = await fetchYoutubeMetadata(url);
      if (yt && yt.title) return yt;
    }

    const og = await fetchOGMetadata(url);
    return {
      title: og.title ?? '',
      thumbnail_url: og.image,
      source_domain: domain,
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
