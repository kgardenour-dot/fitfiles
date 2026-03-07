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

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// URL canonicalization helpers — clean up shared URLs before metadata fetch
// ---------------------------------------------------------------------------

/**
 * Strip the fragment (#...) from a URL. Fragments are never sent to servers,
 * so they can only break metadata fetching.
 */
function stripFragment(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    return u.toString();
  } catch {
    // Fallback: just strip everything after #
    const idx = url.indexOf('#');
    return idx >= 0 ? url.slice(0, idx) : url;
  }
}

/**
 * If the URL is a known redirect wrapper, extract the destination URL.
 * Handles google.com/url?q=, google.com/url?url=, and share.google variants.
 */
function resolveRedirectUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // Google redirect wrappers: /url?q= or /url?url=
    if (host.endsWith('google.com') || host.endsWith('.google.com') || host.includes('google.')) {
      if (u.pathname === '/url') {
        const target = u.searchParams.get('q') || u.searchParams.get('url');
        if (target && /^https?:\/\//i.test(target)) return target;
      }
    }

    return url;
  } catch {
    return url;
  }
}

/**
 * For Google Image result URLs (/imgres?imgurl=...&tbnid=...), extract
 * the original image URL from the `imgurl` query parameter.
 */
function extractGoogleImageUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    if (host.includes('google.') && u.pathname === '/imgres') {
      const imgurl = u.searchParams.get('imgurl');
      if (imgurl && /^https?:\/\//i.test(imgurl)) return imgurl;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * For Google Image search URLs containing a `tbnid` parameter, derive the
 * encrypted-tbn thumbnail URL. This is a last-resort thumbnail when OG
 * metadata fetch fails.
 */
export function extractGoogleTbnThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // Already an encrypted-tbn URL — return as-is
    if (host.startsWith('encrypted-tbn') && host.endsWith('.gstatic.com')) {
      return url;
    }

    if (!host.includes('google.')) return null;

    // Check both search params and the fragment for tbnid
    const tbnid = u.searchParams.get('tbnid') || extractParamFromFragment(u.hash, 'tbnid');
    if (!tbnid) return null;

    return `https://encrypted-tbn0.gstatic.com/images?q=tbn:${encodeURIComponent(tbnid)}`;
  } catch {
    return null;
  }
}

/**
 * Extract a key=value param from a URL fragment string.
 * Fragments can contain query-like params: #imgrc=abc&tbnid=xyz
 */
function extractParamFromFragment(hash: string, key: string): string | null {
  if (!hash) return null;
  const frag = hash.startsWith('#') ? hash.slice(1) : hash;
  // Try key=value pairs separated by & or ;
  const regex = new RegExp(`(?:^|[&;])${key}=([^&;#]+)`);
  const m = frag.match(regex);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Canonicalize a URL for metadata fetching:
 * 1. Resolve redirect wrappers (Google /url?q=...)
 * 2. For Google image result pages, pull the real image URL
 * 3. Strip URL fragments
 */
export function canonicalizeForMetadataFetch(url: string): {
  fetchUrl: string;
  googleImageUrl: string | null;
  googleTbnThumbnail: string | null;
} {
  // Preserve original for Google-specific extraction before stripping
  const googleTbnThumbnail = extractGoogleTbnThumbnail(url);
  const googleImageUrl = extractGoogleImageUrl(url);

  let fetchUrl = resolveRedirectUrl(url);
  // If we resolved a Google /imgres page to the actual image URL, use that
  // for the fetchUrl too (so OG scraping hits the real site, not Google)
  if (googleImageUrl) {
    fetchUrl = googleImageUrl;
  }
  fetchUrl = stripFragment(fetchUrl);

  return { fetchUrl, googleImageUrl, googleTbnThumbnail };
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
      headers: {
        // Use a browser-like User-Agent; many servers block non-browser UAs
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
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
      if (match) return decodeHtmlEntities(match[1]);

      // Also try reversed attribute order: content before property
      const regex2 = new RegExp(
        `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
        'i',
      );
      const match2 = html.match(regex2);
      return match2 ? decodeHtmlEntities(match2[1]) : null;
    };

    const ogTitle = getMetaContent('og:title');
    const twitterTitle = getMetaContent('twitter:title');
    const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const titleFromTag = titleTagMatch ? decodeHtmlEntities(titleTagMatch[1]) : '';
    const ogImage = getMetaContent('og:image');
    const ogImageSecure = getMetaContent('og:image:secure_url');
    const twitterImage = getMetaContent('twitter:image');
    const twitterImageSrc = getMetaContent('twitter:image:src');

    return {
      title: ogTitle ?? twitterTitle ?? titleFromTag,
      image: ogImage || ogImageSecure || twitterImage || twitterImageSrc,
      description: getMetaContent('og:description') ?? getMetaContent('description'),
      siteName: getMetaContent('og:site_name'),
    };
  } catch {
    return fallback;
  }
}

const YOUTUBE_HOSTS = ['youtube.com', 'm.youtube.com', 'youtu.be'];
const TIKTOK_HOSTS = ['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com'];

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

async function resolveFinalUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timeout);
    if (typeof res.url === 'string' && /^https?:\/\//i.test(res.url)) {
      return res.url;
    }
    return url;
  } catch {
    return url;
  }
}

async function fetchTiktokMetadata(url: string): Promise<UrlMetadata | null> {
  const resolvedUrl = await resolveFinalUrl(url);
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;

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
      title: typeof data.title === 'string' ? decodeHtmlEntities(data.title) : '',
      thumbnail_url: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
      source_domain: 'tiktok.com',
    };
  } catch {
    return null;
  }
}

/**
 * Fetch title, thumbnail, and domain from a URL.
 * Best-effort: returns partial data or empty strings on failure.
 * Uses YouTube oEmbed for youtube.com/youtu.be URLs to avoid "Google Search" titles.
 *
 * Canonicalizes the URL before fetching:
 *  - strips fragments (#...) which are never sent to servers
 *  - resolves Google redirect wrappers to the destination URL
 *  - extracts Google tbnid thumbnails as a fallback image
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const domain = extractDomain(url);
  const fallback: UrlMetadata = {
    title: '',
    thumbnail_url: null,
    source_domain: domain,
  };

  try {
    // Canonicalize: resolve redirects, strip fragments, extract Google image hints
    const { fetchUrl, googleTbnThumbnail } = canonicalizeForMetadataFetch(url);

    const hostname = (() => {
      try {
        return new URL(fetchUrl).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    })();

    if (YOUTUBE_HOSTS.includes(hostname)) {
      const yt = await fetchYoutubeMetadata(fetchUrl);
      if (yt && yt.title) return yt;
    }
    if (TIKTOK_HOSTS.includes(hostname) || hostname.endsWith('.tiktok.com')) {
      const tt = await fetchTiktokMetadata(fetchUrl);
      if (tt && (tt.title || tt.thumbnail_url)) return tt;
    }

    const og = await fetchOGMetadata(fetchUrl);

    // Use Google tbn thumbnail as last-resort image if OG didn't provide one
    const thumbnail = og.image || googleTbnThumbnail || null;

    // Filter out generic/useless titles from search engines etc.
    let title = og.title ?? '';
    if (/^google\s*(search)?$/i.test(title.trim()) || /^(bing|yahoo|duckduckgo|search\s*results?)$/i.test(title.trim())) {
      title = '';
    }
    if (!title && hostname === 'instagram.com') {
      title = 'Instagram Post';
    }
    if (!title && (TIKTOK_HOSTS.includes(hostname) || hostname.endsWith('.tiktok.com'))) {
      title = 'TikTok Video';
    }

    return {
      title,
      thumbnail_url: thumbnail,
      source_domain: extractDomain(fetchUrl) || domain,
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
