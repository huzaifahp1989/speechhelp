import {
  getDueBookmarks,
  getHifzBookmarks,
  getHifzBookmarksByCategory,
  getLastPracticedBookmark,
  formatBookmarkLabel,
  daysSinceRevision,
  isBookmarkDue,
  getBookmarkNavigationUrl,
  bookmarkToPracticeRange,
} from '@/lib/hifzBookmarks';
import { HIFZ_CATEGORY_META, type HifzCategory } from '@/types/hifzBookmark';

export type HifzAssistantIntent =
  | { type: 'show_category'; category: HifzCategory }
  | { type: 'open_hifz_tab'; view?: 'stats' | 'due' | 'suggestions' }
  | { type: 'open_bookmark'; bookmarkId: string; autoplay?: boolean; testMode?: boolean }
  | { type: 'continue_lesson' }
  | { type: 'open_today_revision' }
  | { type: 'play_memorization' }
  | { type: 'test_memorization' }
  | { type: 'show_stats' }
  | { type: 'show_due' };

const CATEGORY_PATTERNS: { category: HifzCategory; patterns: RegExp[] }[] = [
  {
    category: 'sabak',
    patterns: [
      /\b(show|open|my)\s+(my\s+)?sabak\b/,
      /\bsabak\s+(lesson|today)\b/,
      /\bnew\s+lesson\b/,
      /\bسباق\b/,
      /\bسبک\b/,
    ],
  },
  {
    category: 'sabak_para',
    patterns: [
      /\b(show|open|my)\s+(my\s+)?sabak\s+para\b/,
      /\bsabak\s+para\b/,
      /\bسباق\s+پارہ\b/,
      /\bpara\s+revision\b/,
    ],
  },
  {
    category: 'dhor',
    patterns: [
      /\b(show|open|my)\s+(my\s+)?dhor\b/,
      /\bdhor\s+revision\b/,
      /\bfull\s+revision\b/,
      /\bدور\b/,
    ],
  },
];

export function parseHifzIntent(text: string): HifzAssistantIntent | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  if (/\b(revision|hifz)\s+statistics\b/.test(lower) || /\bshow\s+(my\s+)?(hifz\s+)?stats\b/.test(lower)) {
    return { type: 'show_stats' };
  }

  if (/\bpages?\s+due\b/.test(lower) || /\boverdue\s+revision\b/.test(lower) || /\bdue\s+for\s+revision\b/.test(lower)) {
    return { type: 'show_due' };
  }

  if (/\bcontinue\s+(from\s+)?(my\s+)?last\s+lesson\b/.test(lower) || /\bresume\s+(my\s+)?lesson\b/.test(lower)) {
    return { type: 'continue_lesson' };
  }

  if (/\b(open\s+)?today'?s?\s+revision\b/.test(lower) || /\brevision\s+today\b/.test(lower)) {
    return { type: 'open_today_revision' };
  }

  if (/\btest\s+(my\s+)?memor/i.test(lower) || /\bmemorization\s+test\b/.test(lower)) {
    return { type: 'test_memorization' };
  }

  if (/\bplay\s+(my\s+)?memor/i.test(lower) || /\bmemorization\s+audio\b/.test(lower)) {
    return { type: 'play_memorization' };
  }

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((p) => p.test(lower))) {
      return { type: 'show_category', category };
    }
  }

  return null;
}

export function resolveHifzIntent(intent: HifzAssistantIntent): string {
  switch (intent.type) {
    case 'show_category':
      return `/hifz-planner?tab=hifz&category=${intent.category}`;
    case 'open_hifz_tab':
      return `/hifz-planner?tab=hifz${intent.view ? `&view=${intent.view}` : ''}`;
    case 'open_bookmark': {
      const bookmark = getHifzBookmarks().find((b) => b.id === intent.bookmarkId);
      if (!bookmark) return '/hifz-planner?tab=hifz';
      if (bookmarkToPracticeRange(bookmark)) {
        return `/hifz-planner?tab=hifz&practice=${bookmark.id}${intent.autoplay ? '&autoplay=1' : ''}${intent.testMode ? '&test=1' : ''}`;
      }
      return getBookmarkNavigationUrl(bookmark, {
        autoplay: intent.autoplay,
        memorize: true,
        testMode: intent.testMode,
      });
    }
    case 'continue_lesson': {
      const last = getLastPracticedBookmark();
      if (!last) return '/hifz-planner?tab=hifz';
      if (bookmarkToPracticeRange(last)) {
        return `/hifz-planner?tab=hifz&practice=${last.id}&autoplay=1`;
      }
      return getBookmarkNavigationUrl(last, { autoplay: true, memorize: true });
    }
    case 'open_today_revision': {
      const due = getDueBookmarks();
      const first = due[0];
      if (!first) return '/hifz-planner?tab=hifz&view=suggestions';
      if (bookmarkToPracticeRange(first)) {
        return `/hifz-planner?tab=hifz&practice=${first.id}&autoplay=1`;
      }
      return getBookmarkNavigationUrl(first, { autoplay: true, memorize: true });
    }
    case 'play_memorization': {
      const sabak = getHifzBookmarksByCategory('sabak')[0];
      if (!sabak) return '/hifz-planner?tab=hifz&category=sabak';
      if (bookmarkToPracticeRange(sabak)) {
        return `/hifz-planner?tab=hifz&practice=${sabak.id}&autoplay=1`;
      }
      return getBookmarkNavigationUrl(sabak, { autoplay: true, memorize: true });
    }
    case 'test_memorization': {
      const sabak = getHifzBookmarksByCategory('sabak')[0];
      if (!sabak) return '/hifz-planner?tab=hifz&category=sabak';
      if (bookmarkToPracticeRange(sabak)) {
        return `/hifz-planner?tab=hifz&practice=${sabak.id}&test=1`;
      }
      return getBookmarkNavigationUrl(sabak, { memorize: true, testMode: true });
    }
    case 'show_stats':
      return '/hifz-planner?tab=hifz&view=stats';
    case 'show_due':
      return '/hifz-planner?tab=hifz&view=due';
    default:
      return '/hifz-planner?tab=hifz';
  }
}

export type HifzSuggestion = {
  id: string;
  tone: 'info' | 'warning' | 'success';
  message: string;
  bookmarkId?: string;
  category?: HifzCategory;
};

export function getHifzRevisionSuggestions(): HifzSuggestion[] {
  const suggestions: HifzSuggestion[] = [];
  const all = getHifzBookmarks();

  for (const category of ['sabak', 'sabak_para', 'dhor'] as HifzCategory[]) {
    const items = getHifzBookmarksByCategory(category);
    const due = items.filter(isBookmarkDue);
    const meta = HIFZ_CATEGORY_META[category];

    if (due.length > 0) {
      const top = sortByOldest(due)[0];
      const days = daysSinceRevision(top);
      const label = formatBookmarkLabel(top);
      if (days === null) {
        suggestions.push({
          id: `${category}-new-${top.id}`,
          tone: 'info',
          message: `Today's ${meta.label}: ${label} — not revised yet.`,
          bookmarkId: top.id,
          category,
        });
      } else if (days >= getReviewInterval(top)) {
        suggestions.push({
          id: `${category}-overdue-${top.id}`,
          tone: 'warning',
          message: `You have not revised ${label} for ${days} day${days !== 1 ? 's' : ''}.`,
          bookmarkId: top.id,
          category,
        });
      } else {
        suggestions.push({
          id: `${category}-due-${top.id}`,
          tone: 'info',
          message: `${meta.label} due today: ${label}.`,
          bookmarkId: top.id,
          category,
        });
      }
    } else if (items.length > 0) {
      suggestions.push({
        id: `${category}-done`,
        tone: 'success',
        message: `You completed your ${meta.label} revision today.`,
        category,
      });
    }
  }

  if (all.length === 0) {
    suggestions.push({
      id: 'empty',
      tone: 'info',
      message: 'Add Sabak, Sabak Para, or Dhor bookmarks to get personalised revision suggestions.',
    });
  }

  return suggestions;
}

function sortByOldest(bookmarks: ReturnType<typeof getHifzBookmarks>) {
  return [...bookmarks].sort((a, b) => (a.lastRevised ?? 0) - (b.lastRevised ?? 0));
}

function getReviewInterval(bookmark: ReturnType<typeof getHifzBookmarks>[0]): number {
  return bookmark.reviewIntervalDays ?? HIFZ_CATEGORY_META[bookmark.category].reviewDays;
}

export const HIFZ_ASSISTANT_COMMANDS = [
  'Show my Sabak',
  'Show my Sabak Para',
  'Show my Dhor revision',
  'Continue from my last lesson',
  "Open today's revision",
  'Play my memorisation audio',
  'Test my memorisation',
  'Show revision statistics',
  'Show pages due for revision',
];
