import { injectOriginalLinkTitle } from '@/sites/pixiv/helpers/injectOriginalLinkTitle';
import { regexp } from '@/lib/regExp';

let started = false;

function getCurrentIds(): { id?: string; unlistedId?: string } {
  const { pathname } = location;

  // /artworks/{id}
  const art = regexp.artworksPage.exec(pathname);
  if (art && art[1]) {
    return { id: art[1] };
  }

  // Unlisted path resolution via canonical link
  const unlisted = regexp.unlisted.exec(pathname);
  if (unlisted) {
    const canonicalUrlEL =
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ||
      document.head.querySelector<HTMLLinkElement>(
        'link[data-next-head][href^="https://www.pixiv.net/artworks/"]'
      );
    const canonicalUrl = canonicalUrlEL?.getAttribute('href');
    const id = canonicalUrl ? regexp.artworksPage.exec(canonicalUrl)?.[1] : undefined;
    return { id, unlistedId: unlisted[0] };
  }

  return {};
}

export function startOriginalLinkWatcher() {
  if (started) return;
  started = true;

  const selector = 'a.gtm-expand-full-size-illust';
  let debounceTimer: number | null = null;

  const schedule = () => {
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(async () => {
      const { id, unlistedId } = getCurrentIds();
      if (!id && !unlistedId) return;

      await injectOriginalLinkTitle(id!, unlistedId, { selector, showNotice: false });
      debounceTimer = null;
    }, 200);
  };

  // Initial attempt
  schedule();

  // React to hash changes (Pixiv often appends #page)
  window.addEventListener('hashchange', schedule);

  // Observe DOM for anchors being added/removed
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.addedNodes.length > 0) {
        // Cheap check: only schedule when an element is added that could contain anchors
        const anyAnchor = (node: Node): boolean =>
          node.nodeType === Node.ELEMENT_NODE &&
          ((node as Element).matches?.(selector) ||
            (node as Element).querySelector?.(selector));

        if (
          anyAnchor(m.target) ||
          Array.from(m.addedNodes).some((n) => anyAnchor(n))
        ) {
          schedule();
          break;
        }
      }
    }
  });

  mo.observe(document.body, { childList: true, subtree: true });
}
