'use client';

import { useCallback, useMemo, useState } from 'react';
import { Quote, ISLAMIC_QUOTES, QuoteCategory } from '@/data/quotes';
import { Search, Filter, Quote as QuoteIcon, Copy, Check, Download, Share2 } from 'lucide-react';

type ShareQuotePayload = {
  t: string;
  a: string;
  c: QuoteCategory;
  s?: string;
};

function toBase64Url(value: string) {
  const b64 = btoa(unescape(encodeURIComponent(value)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createSharePath(quote: Pick<Quote, 'text' | 'author' | 'category' | 'source'>) {
  const payload: ShareQuotePayload = {
    t: quote.text,
    a: quote.author,
    c: quote.category,
    s: quote.source,
  };
  return `/quotes/share?q=${toBase64Url(JSON.stringify(payload))}`;
}

function generatePersonalisedQuote(input: string, category: QuoteCategory) {
  const normalized = input.toLowerCase();

  const tag = (() => {
    if (/(repent|forgiv|sin|guilt|tawbah)/.test(normalized)) return 'repentance';
    if (/(family|mother|father|parents|wife|husband|children|home)/.test(normalized)) return 'family';
    if (/(patience|sabr|stress|anxiety|worry|fear|sad|grief|hard)/.test(normalized)) return 'patience';
    if (/(prayer|salah|dua|dhikr|quran|allah|iman|faith|heart)/.test(normalized)) return 'spiritual';
    if (/(character|manners|kind|anger|tongue|jealous|envy)/.test(normalized)) return 'character';
    return 'general';
  })();

  const openings = [
    'Take a moment and remember:',
    'Hold on to this:',
    'Let this settle in your heart:',
    'A gentle reminder:',
  ];

  const coresByTag: Record<string, string[]> = {
    patience: [
      'your hardship is not a dead end; it is a passage, and Allah sees your effort through it.',
      "patience is not passive—it's choosing what is right while your heart is still healing.",
      'what feels heavy today can become a means of strength tomorrow, by Allah’s permission.',
    ],
    repentance: [
      'returning to Allah is always open; the door is not locked by your past.',
      'the best step after a mistake is a sincere return—small, steady, and honest.',
      'Allah loves your repentance more than you love your relief.',
    ],
    family: [
      'the home becomes lighter when hearts are gentle and words are kind for Allah’s sake.',
      'lead your family with mercy; it is strength, not weakness.',
      'a quiet act of care at home can outweigh loud deeds outside it.',
    ],
    spiritual: [
      'when you feel lost, return to Salah and Qur’an—your soul knows the way back to Allah.',
      'make your heart busy with dhikr; it leaves less room for fear and regret.',
      'trust Allah’s timing, then do your part with sincerity.',
    ],
    character: [
      'protect your tongue; it can be your greatest charity or your greatest regret.',
      'choose adab before argument—hearts open more with gentleness than with force.',
      'measure your character in private; Allah sees what people cannot.',
    ],
    general: [
      'what you carry today can become a reason you grow tomorrow, by Allah’s permission.',
      'do one good deed sincerely, then another—consistency builds the heart.',
      'when you don’t see the full picture, trust Allah who always does.',
    ],
  };

  const closers = [
    'Trust Allah and take the next right step.',
    'Keep going—Allah is with the patient.',
    'Make intention sincere, and let Allah handle what you cannot.',
    'Turn to Allah often; hearts heal in His remembrance.',
  ];

  const opening = openings[Math.floor(Math.random() * openings.length)];
  const cores = coresByTag[tag] ?? coresByTag.general;
  const core = cores[Math.floor(Math.random() * cores.length)];
  const closer = closers[Math.floor(Math.random() * closers.length)];

  return {
    quote: `${opening} ${core} ${closer}`,
    category,
  } as { quote: string; category: QuoteCategory };
}

export default function QuotesPage() {
  const [activeCategory, setActiveCategory] = useState<QuoteCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'posters'>('posters');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);

  const [aiInput, setAiInput] = useState('');
  const [aiCategory, setAiCategory] = useState<QuoteCategory>('Motivation');
  const [aiQuote, setAiQuote] = useState<Quote | null>(null);
  const [aiCopied, setAiCopied] = useState(false);
  const [aiShared, setAiShared] = useState(false);

  const categories: (QuoteCategory | 'All')[] = ['All', 'Wisdom', 'Motivation', 'Spiritual', 'Character', 'Family', 'Repentance'];

  const dailyQuote = useMemo(() => {
    const now = new Date();
    const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return ISLAMIC_QUOTES[seed % ISLAMIC_QUOTES.length];
  }, []);

  const filteredQuotes = useMemo(() => {
    return ISLAMIC_QUOTES.filter(quote => {
      const matchesCategory = activeCategory === 'All' || quote.category === activeCategory;
      const matchesSearch = quote.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            quote.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleShare = useCallback(async (quote: Pick<Quote, 'text' | 'author' | 'category' | 'source'>, id: string) => {
    const path = createSharePath(quote);
    const url = new URL(path, window.location.origin).toString();

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Islamic Quote',
          text: `"${quote.text}" — ${quote.author}`,
          url,
        });
        setSharedId(id);
        setTimeout(() => setSharedId(null), 2000);
        return;
      }
    } catch {
    }

    await navigator.clipboard.writeText(url);
    setSharedId(id);
    setTimeout(() => setSharedId(null), 2000);
  }, []);

  const handleGenerateAiQuote = useCallback(() => {
    const generated = generatePersonalisedQuote(aiInput.trim(), aiCategory);
    setAiQuote({
      id: `ai-${Date.now()}`,
      text: generated.quote,
      author: 'SpeechHelp AI',
      category: generated.category,
    });
    setAiCopied(false);
    setAiShared(false);
  }, [aiCategory, aiInput]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
            Islamic <span className="text-emerald-600">Wisdom & Quotes</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Beneficial sayings from the Quran, Sunnah, and righteous scholars to inspire your heart and mind.
          </p>
        </div>

        <div className="grid gap-6 mb-8 grid-cols-1 lg:grid-cols-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase">Today’s Quote</p>
                <p className="text-sm text-slate-500">A new quote every day</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(`${dailyQuote.text} - ${dailyQuote.author}`, `daily-${dailyQuote.id}`)}
                  className={`p-2 rounded-lg transition-colors ${copiedId === `daily-${dailyQuote.id}` ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                  title="Copy"
                >
                  {copiedId === `daily-${dailyQuote.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleShare(dailyQuote, `daily-${dailyQuote.id}`)}
                  className={`p-2 rounded-lg transition-colors ${sharedId === `daily-${dailyQuote.id}` ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
                  title="Share Link"
                >
                  {sharedId === `daily-${dailyQuote.id}` ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="relative aspect-[16/10] sm:aspect-[16/9]">
              <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(0)} opacity-95`}></div>
              <div className="absolute inset-0 opacity-10 bg-[url('/patterns/islamic-geometry.png')] bg-repeat"></div>
              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between text-white">
                <QuoteIcon className="w-8 h-8 opacity-50" />
                <div className="flex-1 flex items-center justify-center text-center">
                  <p className="text-lg sm:text-2xl font-serif leading-relaxed drop-shadow-md">
                    "{dailyQuote.text}"
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-base sm:text-lg tracking-wide uppercase border-t border-white/30 pt-4 inline-block">
                    {dailyQuote.author}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wider text-purple-700 uppercase">AI Personalised Quote</p>
                <p className="text-sm text-slate-500">Write what you’re feeling and get a shareable quote</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="e.g. I feel anxious about exams, make a short reminder"
                  className="w-full px-4 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div>
                <select
                  value={aiCategory}
                  onChange={(e) => setAiCategory(e.target.value as QuoteCategory)}
                  className="w-full px-4 py-3 bg-slate-100 border-transparent focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 rounded-xl text-sm transition-all outline-none"
                >
                  {categories.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateAiQuote}
              disabled={aiInput.trim().length === 0}
              className="mt-3 w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm transition-colors"
            >
              Generate Quote
            </button>

            {aiQuote && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-slate-800 font-serif leading-relaxed">
                  "{aiQuote.text}"
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-bold text-purple-700">{aiQuote.author}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 bg-white px-2 py-0.5 rounded-full text-xs uppercase tracking-wide border border-slate-200">{aiQuote.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${aiQuote.text} - ${aiQuote.author}`);
                        setAiCopied(true);
                        setTimeout(() => setAiCopied(false), 2000);
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 transition-colors border border-slate-200 bg-white"
                      title="Copy"
                    >
                      {aiCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={async () => {
                        await handleShare(aiQuote, aiQuote.id);
                        setAiShared(true);
                        setTimeout(() => setAiShared(false), 2000);
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-700 transition-colors border border-slate-200 bg-white"
                      title="Copy Share Link"
                    >
                      {aiShared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-20 z-10">
          
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & View Toggle */}
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search quotes or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-lg text-sm transition-all outline-none"
              />
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
               <button 
                 onClick={() => setViewMode('cards')}
                 className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                 title="List View"
               >
                 <Filter className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('posters')}
                 className={`p-2 rounded-md transition-all ${viewMode === 'posters' ? 'bg-white shadow text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}
                 title="Poster View"
               >
                 <QuoteIcon className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>

        {/* Quotes Grid */}
        {filteredQuotes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No quotes found matching your criteria.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === 'posters' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {filteredQuotes.map((quote, index) => (
              viewMode === 'posters' ? (
                // Poster Card
                <div key={quote.id} className="group relative aspect-[4/5] md:aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                  {/* Background Gradient - Randomized slightly based on index */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(index)} opacity-90 transition-opacity group-hover:opacity-100`}></div>
                  
                  {/* Pattern Overlay */}
                  <div className="absolute inset-0 opacity-10 bg-[url('/patterns/islamic-geometry.png')] bg-repeat"></div>

                  <div className="absolute inset-0 p-8 flex flex-col justify-between text-white">
                    <QuoteIcon className="w-8 h-8 opacity-50 mb-4" />
                    
                    <div className="flex-1 flex items-center justify-center text-center">
                      <p className="text-xl md:text-2xl font-serif leading-relaxed drop-shadow-md">
                        "{quote.text}"
                      </p>
                    </div>

                    <div className="mt-6 text-center">
                      <p className="font-bold text-lg tracking-wide uppercase border-t border-white/30 pt-4 inline-block">
                        {quote.author}
                      </p>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    <button 
                      onClick={() => handleCopy(`${quote.text} - ${quote.author}`, quote.id)}
                      className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white transition-colors"
                      title="Copy"
                    >
                      {copiedId === quote.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleShare(quote, quote.id)}
                      className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white transition-colors"
                      title="Share Link"
                    >
                      {sharedId === quote.id ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                    </button>
                    {/* Placeholder for download functionality - could use html-to-image later */}
                    <button className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white transition-colors" title="Save Image (Coming Soon)">
                       <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                // Simple List Card
                <div key={quote.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex-1">
                    <p className="text-lg text-slate-800 font-serif leading-relaxed mb-2">"{quote.text}"</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-emerald-700">{quote.author}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-xs uppercase tracking-wide">{quote.category}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopy(`${quote.text} - ${quote.author}`, quote.id)}
                    className={`p-2 rounded-lg transition-colors ${copiedId === quote.id ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  >
                    {copiedId === quote.id ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleShare(quote, quote.id)}
                    className={`p-2 rounded-lg transition-colors ${sharedId === quote.id ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                    title="Copy Share Link"
                  >
                    {sharedId === quote.id ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                  </button>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getGradient(index: number) {
  const gradients = [
    'from-emerald-600 to-teal-900',
    'from-slate-700 to-slate-900',
    'from-blue-600 to-indigo-900',
    'from-amber-700 to-orange-900',
    'from-rose-700 to-pink-900',
    'from-cyan-600 to-blue-800',
    'from-violet-600 to-purple-900',
    'from-fuchsia-700 to-purple-900'
  ];
  return gradients[index % gradients.length];
}
