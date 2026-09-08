import { useEffect, useState } from 'react';

const scripts = [
  '/assets/fleet-manifest.js',
  '/app-v2.js',
  '/scroll-top.js',
  '/i18n.js',
  '/header-language.js',
] as const;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-legacy-src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    script.src = src;
    script.defer = false;
    script.dataset.legacySrc = src;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load legacy script: ${src}`));
    if (!existing) document.body.appendChild(script);
  });
}

export function LegacyBridge() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        for (const src of scripts) await loadScript(src);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Legacy bootstrap failed');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div id="app" />
      {error ? <div role="alert" className="migration-error">{error}</div> : null}
    </>
  );
}
