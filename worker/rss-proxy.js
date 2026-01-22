/**
 * RSS Proxy - Cloudflare Worker
 * Fetches and parses RSS/Atom feeds, returns JSON
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CACHE_TTL = 300; // 5 minutes

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);
    const feedUrl = url.searchParams.get('url');
    const articleUrl = url.searchParams.get('article');

    // Article extraction mode
    if (articleUrl) {
      return handleArticle(articleUrl, url, request, ctx);
    }

    // RSS feed mode
    if (!feedUrl) {
      return jsonResponse({ error: 'Missing url or article parameter' }, 400);
    }

    // Validate URL
    try {
      new URL(feedUrl);
    } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400);
    }

    // Check cache
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);

    if (response) {
      return response;
    }

    try {
      // Fetch the feed
      const feedResponse = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'DumbOS RSS Reader/1.0',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
      });

      if (!feedResponse.ok) {
        return jsonResponse({ error: `Failed to fetch feed: ${feedResponse.status}` }, 502);
      }

      const xml = await feedResponse.text();
      const feed = parseFeed(xml);

      response = jsonResponse(feed, 200, {
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      });

      // Store in cache
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  },
};

/**
 * Handle article extraction request
 */
async function handleArticle(articleUrl, url, request, ctx) {
  // Validate URL
  try {
    new URL(articleUrl);
  } catch {
    return jsonResponse({ error: 'Invalid article URL' }, 400);
  }

  // Check cache
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  let response = await cache.match(cacheKey);

  if (response) {
    return response;
  }

  try {
    const articleResponse = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DumbOS Reader/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });

    if (!articleResponse.ok) {
      return jsonResponse({ error: `Failed to fetch article: ${articleResponse.status}` }, 502);
    }

    const html = await articleResponse.text();
    const extracted = extractArticle(html, articleUrl);

    response = jsonResponse(extracted, 200, {
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

/**
 * Extract article content from HTML
 */
function extractArticle(html, url) {
  // Extract title
  let title = '';
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  title = ogTitle ? ogTitle[1] : (titleTag ? titleTag[1] : '');
  title = decodeHtmlEntities(title.trim());

  // Remove unwanted elements
  let content = html
    // Remove scripts, styles, and other non-content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove nav, header, footer, aside, forms
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
    // Remove common ad/social divs by class/id patterns
    .replace(/<div[^>]*(class|id)=["'][^"']*(social|share|comment|sidebar|widget|ad-|ads-|advertisement|promo|newsletter|related|recommended)["'][^>]*>[\s\S]*?<\/div>/gi, '');

  // Try to find article content
  let articleContent = '';

  // Look for article tag
  const articleMatch = content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    articleContent = articleMatch[1];
  }

  // Or main tag
  if (!articleContent) {
    const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      articleContent = mainMatch[1];
    }
  }

  // Or common content div patterns
  if (!articleContent) {
    const contentDivMatch = content.match(/<div[^>]*(class|id)=["'][^"']*(article|post|entry|content|story|body)[-_]?(content|body|text)?["'][^>]*>([\s\S]*?)<\/div>/i);
    if (contentDivMatch) {
      articleContent = contentDivMatch[4] || contentDivMatch[0];
    }
  }

  // Fallback: use body
  if (!articleContent) {
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    articleContent = bodyMatch ? bodyMatch[1] : content;
  }

  // Clean up the content
  articleContent = articleContent
    // Remove remaining unwanted tags but keep content
    .replace(/<(button|input|select|textarea|label)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(button|input|select|textarea|label|img)[^>]*\/?>/gi, '')
    // Keep only safe tags
    .replace(/<(?!\/?(?:p|br|h[1-6]|ul|ol|li|blockquote|pre|code|em|strong|b|i|a|figure|figcaption|img)\b)[^>]+>/gi, '')
    // Fix relative URLs for images and links
    .replace(/(src|href)=["'](?!https?:\/\/)([^"']+)["']/gi, (match, attr, path) => {
      try {
        const absolute = new URL(path, url).href;
        return `${attr}="${absolute}"`;
      } catch {
        return match;
      }
    })
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Wrap paragraphs if content is plain text
  if (!articleContent.includes('<p') && !articleContent.includes('<h')) {
    articleContent = '<p>' + articleContent.replace(/\n\n+/g, '</p><p>') + '</p>';
  }

  return {
    title,
    content: articleContent,
    url,
  };
}

/**
 * Create a JSON response with CORS headers
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Parse RSS 2.0 or Atom feed XML to JSON
 */
function parseFeed(xml) {
  // Simple XML parsing without external dependencies
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isAtom) {
    return parseAtom(xml);
  }

  return parseRSS(xml);
}

/**
 * Parse RSS 2.0 feed
 */
function parseRSS(xml) {
  // Extract channel content, then remove items to find the channel-level title
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/i);
  const channelXml = channelMatch ? channelMatch[1] : xml;

  // Remove all items to find channel-level metadata
  const channelMetaXml = channelXml.replace(/<item[^>]*>[\s\S]*?<\/item>/gi, '');
  const title = extractTag(channelMetaXml, null, 'title') || 'Untitled Feed';

  const items = [];

  // Extract all <item> blocks
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    items.push({
      title: extractTag(itemXml, null, 'title') || 'Untitled',
      link: extractTag(itemXml, null, 'link') || '',
      description: stripHtml(extractTag(itemXml, null, 'description') || ''),
      pubDate: extractTag(itemXml, null, 'pubDate') || '',
    });
  }

  return { title, items };
}

/**
 * Parse Atom feed
 */
function parseAtom(xml) {
  // Extract feed content, then remove entries to find the feed-level title
  const feedMatch = xml.match(/<feed[^>]*>([\s\S]*)<\/feed>/i);
  const feedXml = feedMatch ? feedMatch[1] : xml;

  // Remove all entries to find feed-level metadata
  const feedMetaXml = feedXml.replace(/<entry[^>]*>[\s\S]*?<\/entry>/gi, '');
  const title = extractTag(feedMetaXml, null, 'title') || 'Untitled Feed';

  const items = [];

  // Extract all <entry> blocks
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];

    // Get link (Atom uses <link href="..."/>)
    const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
    const link = linkMatch ? linkMatch[1] : '';

    items.push({
      title: extractTag(entryXml, null, 'title') || 'Untitled',
      link,
      description: stripHtml(extractTag(entryXml, null, 'summary') || extractTag(entryXml, null, 'content') || ''),
      pubDate: extractTag(entryXml, null, 'published') || extractTag(entryXml, null, 'updated') || '',
    });
  }

  return { title, items };
}

/**
 * Extract content from an XML tag
 */
function extractTag(xml, parent, tag) {
  let searchXml = xml;

  // If parent specified, find parent first
  if (parent) {
    const parentRegex = new RegExp(`<${parent}[^>]*>([\\s\\S]*?)<\\/${parent}>`, 'i');
    const parentMatch = xml.match(parentRegex);
    if (parentMatch) {
      searchXml = parentMatch[1];
    }
  }

  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
  const cdataMatch = searchXml.match(cdataRegex);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }

  // Regular tag
  const tagRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const tagMatch = searchXml.match(tagRegex);
  if (tagMatch) {
    return decodeHtmlEntities(tagMatch[1].trim());
  }

  return null;
}

/**
 * Strip HTML tags from string
 */
function stripHtml(str) {
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500); // Limit description length
}

/**
 * Decode HTML entities including numeric entities
 */
function decodeHtmlEntities(str) {
  return str
    // Decode numeric entities (decimal)
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    // Decode numeric entities (hex)
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Decode named entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&hellip;/g, '\u2026');
}
