import type { ThumbnailButton } from '@/lib/components/Button/thumbnailButton';
import { ArtworkButton } from '@/lib/components/Button/artworkButton';
import { PixivDownloadConfig } from '@/sites/pixiv/downloadConfig';
import { downloadSetting } from '@/lib/store/downloadSetting.svelte';
import { pixivParser } from '@/sites/pixiv/parser';
import { siteFeature, PixivTagLocale } from '@/lib/store/siteFeature.svelte';

// 多图"展开全部"后各图片下载按钮
export function createWorkExpanedViewBtn(
  id: string,
  downloadArtwork: (btn: ThumbnailButton) => void,
  unlistedId?: string
): void {
  const works = document.querySelectorAll<HTMLAnchorElement>(
    'figure a.gtm-expand-full-size-illust'
  );
  if (works.length < 2) return;

  works.forEach((work, idx) => {
    const container = work.parentElement?.parentElement;
    if (!container || container.querySelector(ArtworkButton.tagNameLowerCase)) return;

    container.appendChild(
      new ArtworkButton({
        id,
        page: idx,
        site: 'pixiv',
        extraData: unlistedId ? { unlistedId } : undefined,
        onClick: downloadArtwork
      })
    );
  });

  // Second pass: compute populated path(s) from real Pixiv metadata and inject into link titles
  (async () => {
    try {
      const tagLang = siteFeature.tagLocale ?? PixivTagLocale.JAPANESE;
      const meta = await pixivParser.parse(unlistedId ?? id, {
        tagLang,
        type: unlistedId ? 'unlisted' : 'api'
      });

      const useTranslatedTags = !!siteFeature.tagLocale && siteFeature.tagLocale !== PixivTagLocale.JAPANESE;
      const option = {
        directoryTemplate: downloadSetting.directoryTemplate,
        filenameTemplate: downloadSetting.filenameTemplate,
        useFileSystemAccessApi: downloadSetting.useFileSystemAccessApi,
        filenameConflictAction: downloadSetting.filenameConflictAction,
        useTranslatedTags
      } as const;

      let configs = Array.isArray(meta.src)
        ? new PixivDownloadConfig(meta).createMulti(option)
        : [new PixivDownloadConfig(meta).create(option)];

      works.forEach((work, idx) => {
        const cfg = configs[idx];
        if (!cfg) return;
        work.title = cfg.path;
      });
    } catch {
      // fail silently; do not block UI/buttons
    }
  })();
}
