import { beforeAll, describe, expect, it, vi } from 'vitest';
import { IllustType } from '@/sites/pixiv/types';
import { SupportedTemplate } from '@/sites/base/downloadConfig';
import { PIXIV_AI_FILENAME_FLAG } from '@/sites/pixiv/aiDetection';
import type { PixivIllustMeta } from '@/sites/pixiv/parser';
import { FilenameConflictAction } from '@/lib/downloader/fileSaveAdapters/fileSystemAccess';

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
  GM_xmlhttpRequest: vi.fn(),
  unsafeWindow: {}
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

describe('PixivDownloadConfig AI flag template', () => {

  it('exposes {aiFlag} placeholder', () => {
    expect(PixivDownloadConfig.supportedTemplate[SupportedTemplate.AI_FLAG]).toBe('{aiFlag}');
  });

  it('returns configured AI flag when artwork is AI', () => {
    const aiMeta: PixivIllustMeta = { ...baseMeta, isAi: true };
    const config = new PixivDownloadConfig(aiMeta);
    const template = (config as any).getTemplateData({ page: '0' });

    expect(template.aiFlag).toBe(PIXIV_AI_FILENAME_FLAG);

    const path = (config as any).getSavePath('', '{title}{aiFlag}', 'png', template);
    expect(path).toBe('Title［AI］.png');
  });

  it('returns empty AI flag when artwork is not AI', () => {
    const nonAiMeta: PixivIllustMeta = { ...baseMeta, isAi: false };
    const config = new PixivDownloadConfig(nonAiMeta);
    const template = (config as any).getTemplateData({ page: '0' });

    expect(template.aiFlag).toBe('');

    const path = (config as any).getSavePath('', '{title}{aiFlag}', 'png', template);
    expect(path).toBe('Title.png');
  });
});

describe('PixivDownloadConfig page template', () => {
  const baseOption = {
    directoryTemplate: '',
    filenameTemplate: '{page}',
    useFileSystemAccessApi: false,
    filenameConflictAction: FilenameConflictAction.UNIQUIFY,
    useTranslatedTags: false
  } as const;

  it('pads page numbers based on total pages', () => {
    const pages = 15;
    const multiMeta = {
      ...baseMeta,
      src: Array.from({ length: pages }, (_, i) => `https://example.com/illust-${i}.png`),
      extendName: Array.from({ length: pages }, () => 'png'),
      illustType: IllustType.manga
    } as PixivIllustMeta<string[]>;

    const config = new PixivDownloadConfig(multiMeta);

    const downloads = config.createMulti({ ...baseOption });

    expect(downloads[0]?.path).toBe('00.png');
    expect(downloads[9]?.path).toBe('09.png');
    expect(downloads[pages - 1]?.path).toBe('14.png');
  });
});
