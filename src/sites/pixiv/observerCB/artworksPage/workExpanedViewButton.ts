import type { ThumbnailButton } from '@/lib/components/Button/thumbnailButton';
import { ArtworkButton } from '@/lib/components/Button/artworkButton';
import { PixivDownloadConfig } from '@/sites/pixiv/downloadConfig';
import { downloadSetting } from '@/lib/store/downloadSetting.svelte';

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

    const link = container.querySelector<HTMLAnchorElement>('a.gtm-expand-full-size-illust');

    if (link && PixivDownloadConfig && downloadSetting) {
      const { directoryTemplate, filenameTemplate, useFileSystemAccessApi, filenameConflictAction } =
        downloadSetting;

      // use a dummy meta from the link for id only; real Pixiv meta is used when downloading
      const illustId = new URL(link.href, location.origin).searchParams.get('illust_id') ?? '';

      const config = new PixivDownloadConfig({
        id: illustId,
        src: link.href,
        extendName: 'jpg',
        artist: '',
        title: '',
        tags: [],
        createDate: ''
      } as any).create({
        directoryTemplate,
        filenameTemplate,
        useFileSystemAccessApi,
        filenameConflictAction,
        useTranslatedTags: false
      } as any);

      const path = Array.isArray(config) ? config[idx]?.path : config.path;

      if (path) {
        link.title = path;
      }
    }

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
}
