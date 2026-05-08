import { NextRequest, NextResponse } from 'next/server';

type Source = {
  id: string;
  name: string;
  host: string;
  kind: 'ddg' | 'wp';
};

type Result = {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  snippet: string;
};

type FeaturedEntry = Result & {
  topics: string[];
};

const SOURCES: Source[] = [
  { id: 'darulfiqh', name: 'Darul Fiqh', host: 'darulfiqh.com', kind: 'wp' },
  { id: 'askimam', name: 'AskImam', host: 'askimam.org', kind: 'ddg' },
  { id: 'daruliftaa', name: 'Darul Iftaa (Kawthari)', host: 'daruliftaa.com', kind: 'wp' },
  { id: 'nurulidah', name: 'Nur al-Idah (Reference)', host: 'ummaharchive.org', kind: 'ddg' },
];

const AUTHENTIC_LIBRARY: FeaturedEntry[] = [
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'Doubts in Salah',
    url: 'https://darulfiqh.com/doubts-in-salaah/',
    snippet: 'Rulings on handling doubts in sajdah/rakaat and when to perform sajdah al-sahw.',
    topics: ['Salah (Prayer)'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: "Salah with the wrong intention, breaking one's salah and performing salah in the wrong sequence",
    url: 'https://darulfiqh.com/salah-with-the-wrong-intention-breaking-ones-salah-and-performing-salah-in-the-wrong-sequence/',
    snippet: 'Wrong intention in salah, how to break salah, and correcting sequence mistakes (Hanafi).',
    topics: ['Salah (Prayer)'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'What is the ruling of performing salah in front of a mirror?',
    url: 'https://darulfiqh.com/what-is-the-ruling-of-performing-salah-in-front-of-a-mirror/',
    snippet: 'Guidance on whether having a mirror in front affects salah and when it becomes disliked.',
    topics: ['Salah (Prayer)'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'Is Zakat due on money saved to buy a house?',
    url: 'https://darulfiqh.com/is-zakat-due-on-money-saved-to-buy-a-house-2/',
    snippet: 'Zakat ruling on savings set aside for a future house purchase (Hanafi).',
    topics: ['Zakat', 'Business & Finance'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'Are Deposits Held in an Offset Mortgage Account Subject to Zakat?',
    url: 'https://darulfiqh.com/are-deposits-held-in-an-offset-mortgage-account-subject-to-zakat-2/',
    snippet: 'Zakat on deposits in offset mortgage accounts and guidance on interest-based transactions.',
    topics: ['Zakat', 'Business & Finance'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'Zakat FAQs',
    url: 'https://darulfiqh.com/zakat-faqs-2/',
    snippet: 'Common Zakat questions: nisab, debts, loans, business stock, and recipients.',
    topics: ['Zakat'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'Does vomiting break the wudhu?',
    url: 'https://darulfiqh.com/does-vomiting-break-the-wudhu/',
    snippet: 'Wudu invalidation rules related to vomiting and the “mouthful” threshold (Hanafi).',
    topics: ['Taharah (Purification)'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'Can Tahiyyatul Wudu be performed any time after making Wudu?',
    url: 'https://darulfiqh.com/can-tahiyyatul-wudu-be-performed-any-time-after-making-wudu-2/',
    snippet: 'Guidance on when to perform Tahiyyatul Wudu and disliked times for nawafil.',
    topics: ['Taharah (Purification)', 'Salah (Prayer)'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'What shall I do if I have a plaster and I need to do Wudhu?',
    url: 'https://darulfiqh.com/what-shall-i-do-if-i-have-a-plaster-and-i-need-to-do-wudhu/',
    snippet: 'Wudu with bandages/plasters and wiping over when removing is harmful.',
    topics: ['Taharah (Purification)'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'How should I become pure if I had a wet dream on a plane?',
    url: 'https://darulfiqh.com/how-should-i-become-pure-if-i-had-a-wet-dream-on-a-plane/',
    snippet: 'Guidance for lack of water/clean place while traveling and when to repeat salah.',
    topics: ['Taharah (Purification)', 'Salah (Prayer)'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'If we did not sign a marriage contract, is the Nikah still valid?',
    url: 'https://darulfiqh.com/if-we-did-not-sign-a-marriage-contract-is-the-nikah-still-valid/',
    snippet: 'Nikah validity based on offer/acceptance and witnesses; documents are not essential.',
    topics: ['Marriage'],
  },
  {
    sourceId: 'darulfiqh',
    sourceName: 'Darul Fiqh',
    title: 'Sending Gifts Prior to Nikah',
    url: 'https://darulfiqh.com/sending-gifts-prior-to-nikah/',
    snippet: 'Guidance on gifting before nikah while avoiding impermissible mixing and fitnah.',
    topics: ['Marriage'],
  },
  {
    sourceId: 'askimam',
    sourceName: 'AskImam',
    title: 'Civil divorce vs Shar’i talaq (public question)',
    url: 'https://askimam.org/public/question_detail/32419',
    snippet: 'Discussion on whether a civil divorce decree constitutes talaq in Shari’ah.',
    topics: ['Divorce', 'Marriage'],
  },
  {
    sourceId: 'askimam',
    sourceName: 'AskImam',
    title: 'Three talaq under duress (public question)',
    url: 'https://askimam.org/public/question_detail/34188',
    snippet: 'Guidance on talaq wording and consequences; consult a Mufti for personal cases.',
    topics: ['Divorce', 'Marriage'],
  },
  {
    sourceId: 'nurulidah',
    sourceName: 'Nur al-Idah (Reference)',
    title: 'Sections Index (Purification, Salah, Fasting, Zakat, Hajj)',
    url: 'https://ummaharchive.org/p/sections-index',
    snippet: 'Reference index for a widely taught Hanafi fiqh text covering worship topics.',
    topics: [
      'Taharah (Purification)',
      'Salah (Prayer)',
      'Fasting (Sawm)',
      'Zakat',
      'Hajj & Umrah',
    ],
  },
  {
    sourceId: 'nurulidah',
    sourceName: 'Nur al-Idah (Reference)',
    title: 'About Nur al-Idah',
    url: 'https://ummaharchive.org/p/about',
    snippet: 'Overview of Nur al-Idah and how the text + translation/commentary are structured.',
    topics: ['Taharah (Purification)', 'Salah (Prayer)', 'Zakat', 'Fasting (Sawm)', 'Hajj & Umrah'],
  },
];

function tokenize(raw: string) {
  return raw
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

function normalizeTopic(raw: string) {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function topicMatches(entryTopics: string[], selectedTopic: string) {
  const needle = normalizeTopic(selectedTopic);
  if (!needle) return true;
  const needleTokens = needle.split(' ').filter((t) => t.length >= 3);

  return entryTopics.some((t) => {
    const key = normalizeTopic(t);
    if (!key) return false;
    if (key === needle) return true;
    if (key.includes(needle)) return true;
    if (needle.includes(key)) return true;
    const keyTokens = key.split(' ');
    return needleTokens.some((tok) => keyTokens.includes(tok));
  });
}

function stripHtml(raw: string) {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}

function normalizeDuckDuckGoRedirect(href: string) {
  try {
    const url = new URL(href, 'https://duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return url.toString();
  } catch {
    return href;
  }
}

function parseDuckDuckGoHtml(html: string) {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  const blockRe = /<div class="result__body">([\s\S]*?)<\/div>\s*<\/div>/g;
  const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i;
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i;

  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) !== null) {
    const block = match[1] || '';
    const linkMatch = linkRe.exec(block);
    if (!linkMatch) continue;

    const rawHref = linkMatch[1] || '';
    const rawTitle = linkMatch[2] || '';
    const snippetMatch = snippetRe.exec(block);
    const rawSnippet = snippetMatch?.[1] || '';

    const url = normalizeDuckDuckGoRedirect(rawHref);
    const title = decodeHtmlEntities(stripHtml(rawTitle));
    const snippet = decodeHtmlEntities(stripHtml(rawSnippet));

    if (!title || !url) continue;
    results.push({ title, url, snippet });
    if (results.length >= 12) break;
  }

  return results;
}

function parseWordPressSearchHtml(html: string) {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  const entryRe =
    /<h[1-6][^>]*class="[^"]*\bentry-title\b[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[1-6]>/gi;

  let match: RegExpExecArray | null;
  while ((match = entryRe.exec(html)) !== null) {
    const url = decodeHtmlEntities(stripHtml(match[1] || ''));
    const title = decodeHtmlEntities(stripHtml(match[2] || ''));
    if (!url || !title) continue;

    const idx = match.index;
    const window = html.slice(idx, idx + 1600);
    const paraMatch = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(window);
    const snippet = decodeHtmlEntities(stripHtml(paraMatch?.[1] || ''));

    results.push({ title, url, snippet });
    if (results.length >= 12) break;
  }

  if (results.length > 0) return results;

  const genericLinkRe = /<a[^>]*rel="bookmark"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = genericLinkRe.exec(html)) !== null) {
    const url = decodeHtmlEntities(stripHtml(match[1] || ''));
    const title = decodeHtmlEntities(stripHtml(match[2] || ''));
    if (!url || !title) continue;
    results.push({ title, url, snippet: '' });
    if (results.length >= 12) break;
  }

  return results;
}

async function fetchTextWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept: 'text/html',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function searchOneSourceDuckDuckGo(source: Source, query: string) {
  const q = `site:${source.host} ${query}`.trim();
  const urls = [
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
    `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
  ];

  let html: string | null = null;
  for (const url of urls) {
    html = await fetchTextWithTimeout(url, 6500);
    if (!html) continue;
    if (/bots use DuckDuckGo too/i.test(html)) continue;
    break;
  }

  if (!html) return [];
  const parsed = parseDuckDuckGoHtml(html);
  return parsed.map<Result>((r) => ({
    sourceId: source.id,
    sourceName: source.name,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
  }));
}

async function searchOneSourceWordPress(source: Source, query: string) {
  const url = `https://${source.host}/?s=${encodeURIComponent(query)}`;
  const html = await fetchTextWithTimeout(url, 6500);
  if (!html) return [];
  if (/captcha|cloudflare|attention required/i.test(html)) return [];
  const parsed = parseWordPressSearchHtml(html);
  return parsed.map<Result>((r) => ({
    sourceId: source.id,
    sourceName: source.name,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
  }));
}

async function searchOneSource(source: Source, query: string) {
  if (source.kind === 'wp') {
    const wp = await searchOneSourceWordPress(source, query);
    if (wp.length > 0) return wp;
  }
  return searchOneSourceDuckDuckGo(source, query);
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  const topic = (request.nextUrl.searchParams.get('topic') || '').trim();
  const sourcesParam = (request.nextUrl.searchParams.get('sources') || '').trim();

  const composed = [topic, q].filter(Boolean).join(' ');
  if (!composed) {
    return NextResponse.json({ results: [] satisfies Result[] });
  }

  if (composed.length > 240) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  const requestedSourceIds = sourcesParam
    ? sourcesParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const allowedSourceIds = new Set(SOURCES.map((s) => s.id));
  let selectedSources = requestedSourceIds.length
    ? SOURCES.filter((s) => requestedSourceIds.includes(s.id) && allowedSourceIds.has(s.id))
    : SOURCES;
  if (selectedSources.length === 0) selectedSources = SOURCES;

  const topicNeedle = topic.toLowerCase();
  const qLower = q.toLowerCase();
  const qTokens = tokenize(q);

  const selectedLibrary = AUTHENTIC_LIBRARY.filter((r) => selectedSources.some((s) => s.id === r.sourceId));
  const library = selectedLibrary.length > 0 ? selectedLibrary : AUTHENTIC_LIBRARY;

  const featuredScored = library.map((r) => {
    if (topicNeedle) {
      if (!topicMatches(r.topics, topicNeedle)) return null;
    }

    if (!qLower) {
      return { score: 1, r };
    }

    const hay = `${r.title} ${r.snippet} ${r.topics.join(' ')}`.toLowerCase();
    let score = 0;
    if (hay.includes(qLower)) score += 4;
    qTokens.forEach((tok) => {
      if (hay.includes(tok)) score += 1;
    });
    if (score <= 0) return null;
    return { score, r };
  }).filter(Boolean) as Array<{ score: number; r: FeaturedEntry }>;

  featuredScored.sort((a, b) => b.score - a.score);

  const featured = featuredScored
    .slice(0, 12)
    .map<Result>(({ r: { topics: _topics, ...rest } }) => rest);

  const topicPool = library.filter((r) => (!topicNeedle ? true : topicMatches(r.topics, topicNeedle)));
  const fallbackPool = (topicPool.length > 0 ? topicPool : library)
    .slice(0, 12)
    .map<Result>(({ topics: _topics, ...rest }) => rest);

  try {
    let flat: Result[] = [...featured];
    try {
      const lists = await Promise.all(selectedSources.map((s) => searchOneSource(s, composed)));
      flat = flat.concat(lists.flat());
    } catch {
      flat = [...featured];
    }

    const unique = new Map<string, Result>();
    flat.forEach((r) => {
      if (!r.url) return;
      if (!unique.has(r.url)) unique.set(r.url, r);
    });

    const list = Array.from(unique.values()).slice(0, 20);
    if (list.length > 0) return NextResponse.json({ results: list });

    return NextResponse.json({ results: fallbackPool });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Search failed' },
      { status: 500 }
    );
  }
}
