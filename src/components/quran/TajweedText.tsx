'use client';

import { Fragment, useMemo } from 'react';
import clsx from 'clsx';
import { normalizeTajweedRuleId, getTajweedRule, getTajweedStyle } from '@/data/tajweedRules';

type Props = {
  /** Raw `text_uthmani_tajweed` from Quran.com API */
  html?: string | null;
  /** Fallback plain Uthmani when tajweed markup missing */
  fallback?: string;
  className?: string;
  /** Hide inline ayah-end glyph from tajweed markup */
  hideAyahMarker?: boolean;
  /** Nested inside .juz-reader-arabic — skip duplicate typography wrapper */
  inline?: boolean;
};

type Token =
  | { type: 'text'; value: string }
  | { type: 'rule'; rule: string; value: string }
  | { type: 'end'; value: string };

const OPEN_TAG = /^<(tajweed|rule) class=([\w-]+)>/;
const CLOSE_TAG = /^<\/(tajweed|rule)>/;
const END_TAG = /^<span class=end>([\s\S]*?)<\/span>/;

function collapseRuleToken(outerRule: string, inner: Token[]): Token[] {
  if (inner.length === 0) return [];
  if (inner.length === 1 && inner[0].type === 'rule') return [inner[0]];
  const text = inner.map((t) => t.value).join('');
  const rules = inner.filter((t): t is Extract<Token, { type: 'rule' }> => t.type === 'rule');
  if (rules.length > 0 && text.length <= 3) {
    return [{ type: 'rule', rule: rules[rules.length - 1].rule, value: text }];
  }
  if (inner.every((t) => t.type === 'text' || t.type === 'rule')) {
    return [{ type: 'rule', rule: outerRule, value: text }];
  }
  return inner;
}

/** Parse nested `<tajweed>` / `<rule>` markup from Quran.com word & verse fields. */
function tokenizeTajweedMarkup(html: string, hideAyahMarker: boolean): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < html.length) {
    const rest = html.slice(pos);

    const endMatch = END_TAG.exec(rest);
    if (endMatch?.index === 0) {
      if (!hideAyahMarker) tokens.push({ type: 'end', value: endMatch[1] });
      pos += endMatch[0].length;
      continue;
    }

    const openMatch = OPEN_TAG.exec(rest);
    if (openMatch?.index === 0) {
      const outerRule = openMatch[2];
      pos += openMatch[0].length;
      const innerStart = pos;
      let depth = 1;

      while (pos < html.length && depth > 0) {
        const chunk = html.slice(pos);
        const innerOpen = OPEN_TAG.exec(chunk);
        const innerClose = CLOSE_TAG.exec(chunk);
        if (innerOpen?.index === 0) {
          depth += 1;
          pos += innerOpen[0].length;
          continue;
        }
        if (innerClose?.index === 0) {
          depth -= 1;
          if (depth === 0) break;
          pos += innerClose[0].length;
          continue;
        }
        pos += 1;
      }

      const innerHtml = html.slice(innerStart, pos);
      const closeMatch = CLOSE_TAG.exec(html.slice(pos));
      if (closeMatch?.index === 0) pos += closeMatch[0].length;

      tokens.push(...collapseRuleToken(outerRule, tokenizeTajweedMarkup(innerHtml, hideAyahMarker)));
      continue;
    }

    const nextTag = rest.indexOf('<');
    if (nextTag === -1) {
      if (rest) tokens.push({ type: 'text', value: rest });
      break;
    }
    if (nextTag === 0) {
      tokens.push({ type: 'text', value: rest[0] });
      pos += 1;
      continue;
    }

    tokens.push({ type: 'text', value: rest.slice(0, nextTag) });
    pos += nextTag;
  }

  return tokens;
}

export default function TajweedText({
  html,
  fallback,
  className = '',
  hideAyahMarker = true,
  inline = false,
}: Props) {
  const wrapClass = inline
    ? clsx('inline text-inherit', className)
    : clsx('juz-reader-arabic text-slate-900', className);

  const nodes = useMemo(() => {
    if (!html?.includes('<tajweed') && !html?.includes('<rule')) {
      return null;
    }
    return tokenizeTajweedMarkup(html, hideAyahMarker);
  }, [html, hideAyahMarker]);

  if (!nodes) {
    return (
      <span className={wrapClass} dir="rtl">
        {fallback || html || ''}
      </span>
    );
  }

  return (
    <span className={wrapClass} dir="rtl">
      {nodes.map((token, i) => {
        if (token.type === 'text') {
          return <Fragment key={i}>{token.value}</Fragment>;
        }
        if (token.type === 'end') {
          return (
            <span
              key={i}
              className="inline-block text-slate-400 text-[0.85em] mx-0.5 align-middle"
              aria-hidden
            >
              {token.value}
            </span>
          );
        }
        const ruleId = normalizeTajweedRuleId(token.rule);
        return (
          <span
            key={i}
            className="tajweed-rule rounded-sm px-0.5"
            data-tajweed={ruleId}
            style={getTajweedStyle(ruleId)}
            title={getTajweedRule(ruleId)?.label ?? token.rule.replace(/_/g, ' ')}
          >
            {token.value}
          </span>
        );
      })}
    </span>
  );
}
