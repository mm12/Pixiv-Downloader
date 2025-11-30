import { PixivDownloadConfig } from '@/sites/pixiv/downloadConfig';
import { pixivParser } from '@/sites/pixiv/parser';
import { downloadSetting } from '@/lib/store/downloadSetting.svelte';
import { siteFeature, PixivTagLocale } from '@/lib/store/siteFeature.svelte';

// TODO: fix bug where navigating to next work on sme page doesn't fetch the current info, nd injects stale info

export type InjectOptions = {
  selector?: string;
  showNotice?: boolean;
  retryDelaysMs?: number[]; // additional retries after initial attempt
};

const defaultOptions: Required<InjectOptions> = {
  selector: 'a.gtm-expand-full-size-illust',
  showNotice: true,
  retryDelaysMs: [600, 1000, 2000, 5000, 20000]
};

function showNotice(text: string) {
  console.log(`[PixivDL] ${text}`)
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.bottom = '12px';
  el.style.right = '12px';
  el.style.zIndex = '2147483647';
  el.style.background = 'rgba(32,32,32,0.9)';
  el.style.color = '#fff';
  el.style.padding = '8px 10px';
  el.style.borderRadius = '6px';
  el.style.fontSize = '12px';
  el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

export async function injectOriginalLinkTitle(
  id: string,
  unlistedId?: string,
  opts?: InjectOptions
): Promise<void> {
  const { selector, showNotice: shouldNotice, retryDelaysMs } = {
    ...defaultOptions,
    ...(opts || {})
  };

  const queryTargets = () =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>(selector!)).filter(
      (a) => !a.dataset.pdlInjected
    );

  const tryInject = async () => {
    const targets = queryTargets();
    if (targets.length === 0) return { injected: 0, total: 0 };

    // fetch meta once
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

    const configs = Array.isArray(meta.src)
      ? new PixivDownloadConfig(meta).createMulti(option)
      : [new PixivDownloadConfig(meta).create(option)];

    let injected = 0;
    const total = Math.min(targets.length, configs.length);

    for (let i = 0; i < total; i++) {
      const link = targets[i];
      const cfg = configs[i];
      if (cfg && cfg.path) {
        link.title = cfg.path;
        link.dataset.pdlInjected = '1';
        injected++;
      }
    }

    return { injected, total: targets.length };
  };

  // Immediate attempt + retries
  let result = await tryInject();
  for (const d of retryDelaysMs) {
    if (result.total > 0 && result.injected >= result.total) break;
    await new Promise((r) => setTimeout(r, d));
    result = await tryInject();
  }

  // If still nothing, set up listeners and perform one more inject when ready
  if (result.injected === 0) {
    let done = false;

    const maybeRun = async () => {
      if (done) return;
      const targets = queryTargets();
      if (targets.length === 0) return;
      done = true;
      mo.disconnect();
      window.removeEventListener('hashchange', onHash);
      await tryInject();
    };

    const onHash = () => void maybeRun();
    window.addEventListener('hashchange', onHash);

    const mo = new MutationObserver(() => void maybeRun());
    mo.observe(document.body, { childList: true, subtree: true });

    // Safety timer to stop observing after a while
    setTimeout(() => {
      if (!done) {
        mo.disconnect();
        window.removeEventListener('hashchange', onHash);
      }
    }, 5000);
  }

  if (shouldNotice) {
    if (result.total > 0) {
      if (result.injected === result.total) {
        showNotice(`Pixiv Downloader: injected ${result.injected}/${result.total} paths`);
      } else {
        showNotice(
          `Pixiv Downloader: injected ${result.injected}/${result.total} paths (some elements updated late)`
        );
      }
    } else {
      showNotice('Pixiv Downloader: no images found to inject');
    }
  }
}
