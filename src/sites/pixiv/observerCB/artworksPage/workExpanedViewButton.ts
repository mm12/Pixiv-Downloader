import type { ThumbnailButton } from '@/lib/components/Button/thumbnailButton';
import { ArtworkButton } from '@/lib/components/Button/artworkButton';
import { injectOriginalLinkTitle } from '@/sites/pixiv/helpers/injectOriginalLinkTitle';
import { Console } from 'console';

// 多图"展开全部"后各图片下载按钮
export function createWorkExpanedViewBtn(
  id: string,
  downloadArtwork: (btn: ThumbnailButton) => void,
  unlistedId?: string
): void {
  const selector = 'figure a.gtm-expand-full-size-illust';

  // notices are handled inside the helper

  const injectAll = async () => {
    const works = document.querySelectorAll<HTMLAnchorElement>(selector);
    if (works.length < 2) return false;

    // add buttons if missing
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

    // compute populated path(s) from real Pixiv metadata and inject into link titles
    await injectOriginalLinkTitle(id, unlistedId, { selector, showNotice: true });
    console.log("PixivDL: injection attempted (exA)");

    return true;
  };

  // First attempt immediately
  injectAll().then((ok) => {
    if (ok) return;

    // Fallback 1: hashchange (Pixiv appends page hash like #1 when expanded content loads)
    const onHash = () => {
      injectAll().then((done) => {
        if (done) {
          window.removeEventListener('hashchange', onHash);
        }
      });
    };
    window.addEventListener('hashchange', onHash);

    // Fallback 2: watch DOM for anchors being added
    const mo = new MutationObserver(() => {
      const links = document.querySelectorAll<HTMLAnchorElement>(selector);
      if (links.length >= 2) {
        mo.disconnect();
        window.removeEventListener('hashchange', onHash);
        void injectAll();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  });
}
