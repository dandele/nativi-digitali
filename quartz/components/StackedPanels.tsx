import { QuartzComponent, QuartzComponentConstructor } from "./types"

const StackedPanels: QuartzComponent = () => <></>

StackedPanels.afterDOMLoaded = `
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────
  let openPanels   = [];
  let validSlugs   = null;   // Set<string> — populated from contentIndex.json
  let indexReady   = false;

  // ── Content index ──────────────────────────────────────────────────────
  // Quartz already fetches this; we piggyback on it.
  async function loadIndex() {
    if (indexReady) return;
    try {
      const base = document.querySelector('base')?.href ?? window.location.origin + '/';
      const res  = await fetch(new URL('static/contentIndex.json', base));
      const data = await res.json();
      validSlugs = new Set(Object.keys(data));
    } catch {
      validSlugs = new Set(); // fail-open: treat all links as valid
    }
    indexReady = true;
    markBrokenLinks(document.body);
  }

  // ── Slug extraction ────────────────────────────────────────────────────
  function hrefToSlug(href) {
    try {
      const url  = new URL(href, window.location.origin);
      const path = decodeURIComponent(url.pathname);
      return path.replace(/^\\//, '').replace(/\\/$/, '').replace(/\\.html$/, '') || 'index';
    } catch { return null; }
  }

  function isPublished(href) {
    if (!indexReady || !validSlugs) return true; // assume valid until index loads
    const slug = hrefToSlug(href);
    return slug !== null && validSlugs.has(slug);
  }

  // ── Link classification ────────────────────────────────────────────────
  function isInternalLink(el) {
    try {
      if (!el.href || el.tagName !== 'A') return false;
      const url = new URL(el.href, window.location.origin);
      if (url.origin !== window.location.origin) return false; // external
      if (url.hash && url.pathname === window.location.pathname) return false; // same-page anchor
      if (/\\.(png|jpe?g|gif|svg|pdf|mp4|webm|mp3|zip|css|js)$/i.test(url.pathname)) return false;
      if (el.target === '_blank') return false;
      if (el.dataset.noPopover === 'true') return false;
      // Skip anchor-only heading links (Quartz adds these)
      if (el.getAttribute('href')?.startsWith('#')) return false;
      return true;
    } catch { return false; }
  }

  // ── Broken links ───────────────────────────────────────────────────────
  function markBrokenLinks(root) {
    if (!indexReady) return;
    root.querySelectorAll('a.internal[href], a[href]').forEach(link => {
      if (!isInternalLink(link)) return;
      if (!isPublished(link.href)) {
        link.classList.add('nd-broken');
        link.dataset.panelBound = 'skip'; // prevent panel binding
      }
    });
  }

  // ── Panel root ─────────────────────────────────────────────────────────
  function ensureRoot() {
    if (document.getElementById('panel-stack-root')) return;
    const root = document.createElement('div');
    root.id = 'panel-stack-root';
    document.body.appendChild(root);
  }

  // ── Open panel ─────────────────────────────────────────────────────────
  async function openPanel(href, parentPanel) {
    const path = hrefToSlug(href);

    // Already open — flash it
    const dup = openPanels.find(p => p.path === path);
    if (dup) {
      dup.el.classList.add('panel-flash');
      dup.el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      setTimeout(() => dup.el.classList.remove('panel-flash'), 600);
      return;
    }

    // Close panels opened after the clicked parent
    if (parentPanel) {
      const idx = openPanels.findIndex(p => p === parentPanel);
      if (idx !== -1) {
        openPanels.slice(idx + 1).forEach(p => animateClose(p));
        openPanels = openPanels.slice(0, idx + 1);
      }
    }

    // Placeholder panel
    const el = document.createElement('div');
    el.className = 'stacked-panel panel-loading';
    el.innerHTML = \`
      <div class="panel-header">
        <button class="panel-close" aria-label="Chiudi">✕</button>
        <span class="panel-loading-title">Caricamento…</span>
      </div>
      <div class="panel-body"><div class="panel-spinner"></div></div>
    \`;

    document.getElementById('panel-stack-root').appendChild(el);
    void el.getBoundingClientRect(); // force reflow
    el.classList.add('panel-visible');
    el.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });

    const panelData = { path, el };
    openPanels.push(panelData);
    el.querySelector('.panel-close').addEventListener('click', () => closeFrom(panelData));

    // Fetch
    try {
      const res  = await fetch(href);
      const text = await res.text();
      const doc  = new DOMParser().parseFromString(text, 'text/html');

      const title = (
        doc.querySelector('h1.article-title')?.textContent?.trim() ||
        doc.querySelector('h1')?.textContent?.trim() ||
        doc.title?.split('·')[0]?.trim() ||
        'Nota'
      );

      // Extract article body, strip nav cruft
      const article = doc.querySelector('article') || doc.querySelector('.center') || doc.body;
      ['.left.sidebar','.right.sidebar','nav','footer','.toc','.backlinks',
       '.graph','.breadcrumb-container','.tags','.content-meta',
       '#panel-stack-root'
      ].forEach(sel => article.querySelectorAll(sel).forEach(n => n.remove()));

      el.classList.remove('panel-loading');
      el.innerHTML = \`
        <div class="panel-header">
          <button class="panel-close" aria-label="Chiudi">✕</button>
          <a href="\${href}" class="panel-title" title="\${title}">\${title}</a>
        </div>
        <div class="panel-body panel-content"></div>
      \`;
      el.querySelector('.panel-content').appendChild(article);
      el.querySelector('.panel-close').addEventListener('click', () => closeFrom(panelData));

      // Mark broken links inside the fetched content, then wire valid ones
      markBrokenLinks(el);
      bindLinks(el, panelData);

    } catch {
      el.querySelector('.panel-body').innerHTML =
        '<p class="panel-error">Impossibile caricare la nota.</p>';
    }
  }

  // ── Close ──────────────────────────────────────────────────────────────
  function animateClose(panelData) {
    panelData.el.classList.remove('panel-visible');
    setTimeout(() => panelData.el.remove(), 300);
  }

  function closeFrom(panelData) {
    const idx = openPanels.findIndex(p => p === panelData);
    if (idx === -1) return;
    openPanels.slice(idx).forEach(animateClose);
    openPanels = openPanels.slice(0, idx);
  }

  // ── Wire links ─────────────────────────────────────────────────────────
  // capture: true → runs before Quartz's SPA router
  function bindLink(link, parentPanel) {
    if (link.dataset.panelBound) return;
    link.dataset.panelBound = 'true';
    link.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openPanel(link.href, parentPanel);
    }, true);
  }

  function bindLinks(scope, parentPanel) {
    scope.querySelectorAll('a[href]').forEach(link => {
      if (!isInternalLink(link)) return;
      if (link.dataset.panelBound) return; // already handled or marked broken/skip
      if (!isPublished(link.href)) {
        link.classList.add('nd-broken');
        link.dataset.panelBound = 'skip';
        return;
      }
      bindLink(link, parentPanel);
    });
  }

  // ── MutationObserver ───────────────────────────────────────────────────
  // Catches dynamically added links (Quartz popovers, SPA content swaps, etc.)
  let mutationDebounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(mutationDebounce);
    mutationDebounce = setTimeout(() => {
      markBrokenLinks(document.body);
      bindLinks(document.body, null);
    }, 60);
  });

  // ── Init ───────────────────────────────────────────────────────────────
  function init() {
    ensureRoot();
    bindLinks(document.body, null);
    markBrokenLinks(document.body);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureRoot();
    observer.observe(document.body, { childList: true, subtree: true });
    loadIndex().then(init);
  });

  // SPA nav: keep panels, re-wire new page links
  document.addEventListener('nav', () => {
    ensureRoot();
    bindLinks(document.body, null);
    if (indexReady) markBrokenLinks(document.body);
  });
})();
`

export default (() => StackedPanels) satisfies QuartzComponentConstructor
