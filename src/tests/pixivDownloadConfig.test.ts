import { beforeAll, describe, expect, it, vi } from 'vitest';
import { IllustType } from '@/sites/pixiv/types';
import { SupportedTemplate } from '@/sites/base/downloadConfig';
import { PIXIV_AI_FILENAME_FLAG } from '@/sites/pixiv/aiDetection';
import type { PixivIllustMeta } from '@/sites/pixiv/parser';

vi.mock('@/lib/env', () => ({
  env: {
    isBrowserDownloadMode: () => false,
    isSupportSubpath: () => false,
    isViolentMonkey: () => false,
    isTamperMonkey: () => false,
    isFirefox: () => false,
    isSafari: () => false,
    isUserscript: () => true
  }
}));

vi.mock('$', () => ({
  GM_xmlhttpRequest: vi.fn()
}));

vi.mock('@/lib/db', () => ({
  historyDb: {
    getImageEffect: vi.fn(),
    addImageEffect: vi.fn()
  }
}));

vi.mock('@/lib/converter', () => ({
  converter: {
    addFrame: vi.fn(),
    framesCount: vi.fn().mockReturnValue(0),
    clearFrames: vi.fn(),
    appendPixivEffect: vi.fn(),
    convert: vi.fn()
  }
}));

vi.mock('@/lib/downloader', () => ({
  downloader: {
    download: vi.fn()
  }
}));

let PixivDownloadConfig: typeof import('@/sites/pixiv/downloadConfig').PixivDownloadConfig;

beforeAll(async () => {
  (globalThis as any).GM_info = { downloadMode: 'browser' };
  (globalThis as any).GM_xmlhttpRequest = vi.fn();

  ({ PixivDownloadConfig } = await import('@/sites/pixiv/downloadConfig'));
});

describe('PixivDownloadConfig AI flag template', () => {
  const baseMeta: PixivIllustMeta = {
    id: '123',
    src: 'https://example.com/illust.png',
    extendName: 'png',
    artist: 'Artist',
    title: 'Title',
    tags: ['tag'],
    tagsTranslated: ['tag'],
    userId: '42',
    comment: '',
    token: '',
    bookmarkData: null,
    createDate: '2025-01-01T00:00:00Z',
    likeData: false,
    bookmarkCount: 100,
    isAi: false,
    illustType: IllustType.illusts
  };

  it('exposes {aiFlag} placeholder', () => {
    expect(PixivDownloadConfig.supportedTemplate[SupportedTemplate.AI_FLAG]).toBe('{aiFlag}');
  });

  it('returns configured AI flag when artwork is AI', () => {
    const aiMeta: PixivIllustMeta = { ...baseMeta, isAi: true };
    const config = new PixivDownloadConfig(aiMeta);
    const template = (config as any).getTemplateData({ page: '0' });

    expect(template.aiFlag).toBe(PIXIV_AI_FILENAME_FLAG);
  });

  it('returns empty AI flag when artwork is not AI', () => {
    const nonAiMeta: PixivIllustMeta = { ...baseMeta, isAi: false };
    const config = new PixivDownloadConfig(nonAiMeta);
    const template = (config as any).getTemplateData({ page: '0' });

    expect(template.aiFlag).toBe('');
  });
});
