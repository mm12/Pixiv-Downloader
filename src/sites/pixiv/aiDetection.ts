export const PIXIV_AI_KEYWORDS = [
  'AI-generated',
  'StableDiffusion',
  'NovelAI'
];

export const PIXIV_AI_FILENAME_FLAG = '［AI］';

const getKeywordSet = () => new Set(PIXIV_AI_KEYWORDS.map((keyword) => keyword.toLowerCase()));

/**
 * Update PIXIV_AI_KEYWORDS above to customise detection without hunting through the codebase.
 */
export function containsAiKeyword(tags: string[] | undefined): boolean {
  if (!tags?.length) return false;

  const keywordSet = getKeywordSet();

  return tags.some((tag) => keywordSet.has(tag.trim().toLowerCase()));
}

export function hasAiBadge(node: Document | DocumentFragment | Element | null | undefined): boolean {
  if (!node) return false;

  const keywordSet = getKeywordSet();
  const anchors = 'querySelectorAll' in node ? node.querySelectorAll('a[href]') : undefined;
  if (!anchors?.length) return false;

  for (const anchor of anchors) {
    const text = anchor.textContent?.trim();
    if (!text) continue;
    if (keywordSet.has(text.toLowerCase())) return true;
  }

  return false;
}

export function detectAiFlag(options: {
  aiType?: number;
  tags?: string[];
  translatedTags?: string[];
  badgeRoot?: Document | DocumentFragment | Element | null;
}): boolean {
  const { aiType = 0, tags, translatedTags, badgeRoot } = options;

  if (aiType === 2) return true;

  if (containsAiKeyword(tags) || containsAiKeyword(translatedTags)) {
    return true;
  }

  if (hasAiBadge(badgeRoot)) return true;

  return false;
}
