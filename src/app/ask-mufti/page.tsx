'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Loader2, Mail, MessageCircle, Search, ShieldCheck } from 'lucide-react';

type MuftiSource = {
  id: string;
  name: string;
  host: string | null;
  homepageUrl: string;
};

type MuftiSearchResult = {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  snippet: string;
};

type AuthenticEntry = MuftiSearchResult & {
  topics: string[];
};

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

function scoreEntry(hay: string, qLower: string, tokens: string[]) {
  let score = 0;
  if (qLower && hay.includes(qLower)) score += 4;
  tokens.forEach((tok) => {
    if (hay.includes(tok)) score += 1;
  });
  return score;
}

const EMAIL_TO = 'imediac786@gmail.com';
const WHATSAPP_NUMBER_DISPLAY = '07404644610';
const WHATSAPP_NUMBER_E164 = '447404644610';

const SOURCES: MuftiSource[] = [
  { id: 'darulfiqh', name: 'Darul Fiqh', host: 'darulfiqh.com', homepageUrl: 'https://darulfiqh.com' },
  { id: 'askimam', name: 'AskImam', host: 'askimam.org', homepageUrl: 'https://www.askimam.org' },
  { id: 'daruliftaa', name: 'Darul Iftaa (Kawthari)', host: 'daruliftaa.com', homepageUrl: 'https://daruliftaa.com' },
  { id: 'nurulidah', name: 'Nur al-Idah (Reference)', host: 'ummaharchive.org', homepageUrl: 'https://ummaharchive.org/p/about' },
];

const TOPICS = [
  'Salah (Prayer)',
  'Taharah (Purification)',
  'Zakat',
  'Fasting (Sawm)',
  'Hajj & Umrah',
  'Marriage',
  'Divorce',
  'Business & Finance',
  'Inheritance',
  'Aqidah (Belief)',
];

const AUTHENTIC_LIBRARY: AuthenticEntry[] = [
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

function buildMailtoHref({
  topic,
  question,
  name,
  email,
}: {
  topic: string;
  question: string;
  name: string;
  email: string;
}) {
  const safeTopic = topic.trim() || 'General';
  const safeQuestion = question.trim();

  const subject = `Mufti Question (${safeTopic})`;
  const lines = [
    `Topic: ${safeTopic}`,
    name.trim() ? `Name: ${name.trim()}` : null,
    email.trim() ? `Email: ${email.trim()}` : null,
    '',
    'Question:',
    safeQuestion,
  ].filter(Boolean) as string[];

  const body = lines.join('\n');
  return `mailto:${encodeURIComponent(EMAIL_TO)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildWhatsappHref(message: string) {
  const text = message.trim();
  return `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent(text)}`;
}

export default function AskMuftiPage() {
  const [initialTopic, setInitialTopic] = useState('');
  const [initialQ, setInitialQ] = useState('');

  const [topic, setTopic] = useState(initialTopic);
  const [question, setQuestion] = useState(initialQ);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [results, setResults] = useState<MuftiSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [autoSearchDone, setAutoSearchDone] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(SOURCES.map((s) => s.id));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setInitialTopic((params.get('topic') || '').trim());
    setInitialQ((params.get('q') || '').trim());
  }, []);

  useEffect(() => {
    if (!initialTopic) return;
    setTopic((prev) => prev || initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    if (!initialQ) return;
    setQuestion((prev) => prev || initialQ);
    setSearchQuery((prev) => prev || initialQ);
  }, [initialQ]);

  const runSearch = useCallback(async () => {
    const q = (searchQuery || question).trim();
    if (!q && !topic.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    const topicValue = topic.trim();
    const qLower = q.toLowerCase();
    const tokens = tokenize(q);
    const selectedSet = new Set(selectedSources);
    let filteredLibrary = AUTHENTIC_LIBRARY.filter((r) => selectedSet.has(r.sourceId));
    if (filteredLibrary.length === 0) filteredLibrary = AUTHENTIC_LIBRARY;
    const topicPool = filteredLibrary.filter((r) => (!topicValue ? true : topicMatches(r.topics, topicValue)));
    const baselinePool = topicPool.length > 0 ? topicPool : filteredLibrary;
    const baselineResults = baselinePool
      .slice(0, 12)
      .map<MuftiSearchResult>(({ topics: _topics, ...rest }) => rest);

    const localScored = baselinePool.map((r) => {
      if (!qLower) return { score: 1, r };

      const hay = `${r.title} ${r.snippet} ${r.topics.join(' ')}`.toLowerCase();
      const score = scoreEntry(hay, qLower, tokens);
      if (score <= 0) return null;
      return { score, r };
    }).filter(Boolean) as Array<{ score: number; r: AuthenticEntry }>;

    localScored.sort((a, b) => b.score - a.score);
    let localResults = localScored.slice(0, 12).map<MuftiSearchResult>(({ r: { topics: _topics, ...rest } }) => rest);
    if (localResults.length === 0) localResults = baselineResults;
    setResults(localResults);

    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (topicValue) params.set('topic', topicValue);
      if (selectedSources.length > 0 && selectedSources.length < SOURCES.length) {
        params.set('sources', selectedSources.join(','));
      }
      const url = params.toString() ? `/api/mufti-search?${params.toString()}` : '/api/mufti-search';
      const res = await fetch(url, { method: 'GET' });
      const data = (await res.json()) as { results?: MuftiSearchResult[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error || `Search failed (${res.status})`);
      }

      const incoming = Array.isArray(data.results) ? data.results : [];
      const unique = new Map<string, MuftiSearchResult>();
      [...localResults, ...incoming].forEach((r) => {
        if (!r.url) return;
        if (!unique.has(r.url)) unique.set(r.url, r);
      });
      setResults(Array.from(unique.values()));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }, [question, searchQuery, selectedSources, topic]);

  useEffect(() => {
    if (autoSearchDone) return;
    if (!searchQuery.trim() && !topic.trim()) return;
    const handle = setTimeout(() => {
      void runSearch();
    }, 350);
    return () => clearTimeout(handle);
  }, [autoSearchDone, runSearch, searchQuery, topic]);

  useEffect(() => {
    if (autoSearchDone) return;
    if (!initialQ && !initialTopic) return;
    if (!topic.trim() && !searchQuery.trim()) return;
    setAutoSearchDone(true);
    void runSearch();
  }, [autoSearchDone, initialQ, initialTopic, runSearch, searchQuery, topic]);

  const composedSearch = useMemo(() => {
    const q = (searchQuery || question).trim();
    const t = topic.trim();
    if (!q && !t) return '';
    if (!q) return t;
    if (!t) return q;
    return `${t}: ${q}`;
  }, [question, searchQuery, topic]);

  const libraryMatches = useMemo(() => {
    const q = (searchQuery || question).trim();
    const t = topic.trim();
    const tokens = tokenize(q);
    const selectedSet = new Set(selectedSources);
    const selectedFiltered = AUTHENTIC_LIBRARY.filter((r) => selectedSet.has(r.sourceId));
    const pool = selectedFiltered.length > 0 ? selectedFiltered : AUTHENTIC_LIBRARY;

    return pool.filter((r) => {
      if (t) {
        if (!topicMatches(r.topics, t)) return false;
      }
      if (!q) return true;
      const hay = `${r.title} ${r.snippet} ${r.topics.join(' ')}`.toLowerCase();
      if (hay.includes(q.toLowerCase())) return true;
      return tokens.some((tok) => hay.includes(tok));
    }).slice(0, 8);
  }, [question, searchQuery, selectedSources, topic]);

  const googleSiteSearchQuery = useMemo(() => {
    const q = (searchQuery || question).trim();
    const t = topic.trim();
    const composed = [t, q].filter(Boolean).join(' ').trim();
    return composed;
  }, [question, searchQuery, topic]);

  const selectedSourceNames = useMemo(() => {
    const set = new Set(selectedSources);
    const list = SOURCES.filter((s) => set.has(s.id)).map((s) => s.name);
    const names = list.length > 0 ? list : SOURCES.map((s) => s.name);
    return names.join(' • ');
  }, [selectedSources]);

  const emailHref = useMemo(() => {
    if (!question.trim()) return null;
    return buildMailtoHref({ topic, question, name, email });
  }, [email, name, question, topic]);

  const whatsappHref = useMemo(() => {
    const safeTopic = topic.trim() || 'General';
    const safeQuestion = question.trim();
    if (!safeQuestion) return buildWhatsappHref(`Assalamu alaikum. I have a question for a reliable Mufti.`);
    return buildWhatsappHref(`Assalamu alaikum. Topic: ${safeTopic}\n\nQuestion:\n${safeQuestion}`);
  }, [question, topic]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                Trusted sources + Mufti review
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Ask a Question
              </h1>
              <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                Search reliable fatawa sources by topic, and if you can’t find an answer, send your question to a trusted Mufti.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/topics"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold"
              >
                Browse topics <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                WhatsApp Mufti <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-5">
            <h2 className="text-lg font-bold text-slate-900">Your question</h2>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Topic</label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                  >
                    <option value="">General</option>
                    {TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Your name (optional)</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Email (optional)</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                  placeholder="name@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={7}
                  className="w-full px-3 py-3 rounded-xl bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                  placeholder="Write your question with context (location, school of thought if relevant, situation, etc.)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={emailHref || undefined}
                onClick={(e) => {
                  if (!emailHref) e.preventDefault();
                }}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold ${
                  emailHref ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                Email question <Mail className="w-4 h-4" />
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                WhatsApp question <MessageCircle className="w-4 h-4" />
              </a>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
              If you can’t find an answer, WhatsApp your question to <span className="font-bold">{WHATSAPP_NUMBER_DISPLAY}</span>. We will send your question to a reliable Mufti.
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900">Search answers</h2>
              <div className="text-xs font-semibold text-slate-500">
                Sources: {selectedSourceNames}
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    void runSearch();
                  }}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                  placeholder="Search the sources (e.g. zakat on savings, missed salah, talaq wording)"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => {
                  const active = selectedSources.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedSources((prev) => {
                          if (prev.includes(s.id)) {
                            const next = prev.filter((x) => x !== s.id);
                            return next.length > 0 ? next : prev;
                          }
                          return [...prev, s.id];
                        });
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                        active
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      aria-pressed={active}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={runSearch}
                disabled={searchLoading || (!searchQuery.trim() && !topic.trim() && !question.trim())}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search trusted sources
              </button>

              {searchError && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                  {searchError}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {composedSearch && (
                <div className="text-xs text-slate-500">
                  Query: <span className="font-semibold text-slate-700">{composedSearch}</span>
                </div>
              )}

              {googleSiteSearchQuery && (
                <div className="flex flex-wrap gap-2">
                  {SOURCES.filter((s) => s.host && selectedSources.includes(s.id)).map((s) => (
                    <a
                      key={s.id}
                      href={`https://www.google.com/search?q=${encodeURIComponent(`site:${s.host} ${googleSiteSearchQuery}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold"
                    >
                      Search {s.name}
                    </a>
                  ))}
                </div>
              )}

              {libraryMatches.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-extrabold text-slate-900">Authentic Q&amp;A</div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      Curated links
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {libraryMatches.map((r) => (
                      <a
                        key={`lib-${r.sourceId}-${r.url}`}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-500">{r.sourceName}</div>
                            <div className="font-semibold text-slate-900 line-clamp-2">{r.title}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </div>
                        {r.snippet && (
                          <div className="mt-1 text-sm text-slate-600 line-clamp-2">{r.snippet}</div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {results.length === 0 && !searchLoading ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                  No results yet. Search by topic, or paste your full question and search.
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((r) => (
                    <a
                      key={`${r.sourceId}-${r.url}`}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-500">
                            {r.sourceName}
                          </div>
                          <div className="font-semibold text-slate-900 line-clamp-2">
                            {r.title}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </div>
                      {r.snippet && (
                        <div className="mt-2 text-sm text-slate-600 line-clamp-3">
                          {r.snippet}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
              <div className="text-xs font-bold text-blue-800">Direct site links</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {SOURCES.map((s) => (
                  <a
                    key={s.id}
                    href={s.homepageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-white border border-blue-100 hover:border-blue-200 text-sm font-semibold text-slate-800 flex items-center justify-center gap-2"
                  >
                    {s.name} <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
