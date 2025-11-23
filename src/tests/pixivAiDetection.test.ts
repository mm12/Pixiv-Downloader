import { describe, expect, it } from 'vitest';
import { detectAiFlag } from '@/sites/pixiv/aiDetection';

describe('Pixiv AI detection', () => {
  it('returns true when aiType indicates AI artwork', () => {
    expect(detectAiFlag({ aiType: 2 })).toBe(true);
  });

  it('returns true when tags include configured keywords', () => {
    expect(detectAiFlag({ tags: ['StableDiffusion'] })).toBe(true);
  });

  it('matches keywords without case sensitivity', () => {
    expect(detectAiFlag({ translatedTags: ['novelai'] })).toBe(true);
  });

  it('returns true when AI badge anchor appears in markup', () => {
    const badgeRoot = {
      querySelectorAll: (_selector: string) => [
        {
          textContent: 'AI-generated'
        }
      ]
    } as unknown as Document;

    expect(detectAiFlag({ badgeRoot })).toBe(true);
  });

  it('returns false when no AI indicators are present', () => {
    expect(
      detectAiFlag({
        aiType: 1,
        tags: ['landscape', 'original'],
        translatedTags: ['landscape']
      })
    ).toBe(false);
  });
});
