import { QuartzComponent, QuartzComponentConstructor } from "./types"

const StackedPanels: QuartzComponent = () => <></>

StackedPanels.afterDOMLoaded = `
(function () {
  'use strict';

  let openPanels = [];
  let validSlugs = null;
  let indexReady = false;

  // Handles GitHub Pages subdirectory (e.g. /nativi-digitali/)
  function getBasePath() {
    const baseEl = document.querySelector('base');
    if (!baseEl) return '/';
    try { return new URL(baseEl.href).pathname; } catch { return '/'; }
  }

  async function loadIndex() {
    if (indexReady) return;
    try {
      const base = document.querySelector('base')?.href ?? window.location.origin + '/';
      const res  = await fetch(new URL('static/contentIndex.json', base));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      validSlugs = new Set(Object.keys(data));
      indexReady = true;
      markBrokenLinks(document.body);
      bindLinks(document.body, null);
    } catch (e) {
      console.warn('[StackedPanels] contentIndex unavailable, retrying:', e);
      setTimeout(loadIndex, 4000);
    }
  }

  function hrefToSlug(href) {
    try {
      const url      = new URL(href, window.location.origin);
      const basePath = getBasePath();
      let path       = decodeURIComponent(url.pathname);
      if (basePath !== '/' && path.startsWith(basePath)) {
        path = path.slice(basePath.length);
      } else {
        path = path.replace(/^\\//, '');
      }
      return path.replace(/\\/$/, '').replace(/\\.html$/, '') || 'index';
    } catch { return null; }
  }

  function isPublished(href) {
    if (!indexReady || !validSlugs) return true;
    const slug = hrefToSlug(href);
    return slug !== null && validSlugs.has(slug);
  }

  function isInternalLink(el) {
    try {
      if (!el.href || el.tagName !== 'A') return false;
      const url = new URL(el.href, window.location.origin);
      if (url.origin !== window.location.origin) return false;
      if (url.hash && url.pathname === window.location.pathname) return false;
      if (/\\.(png|jpe?g|gif|svg|pdf|mp4|webm|mp3|zip|css|js)$/i.test(url.pathname)) return false;
      if (el.target === '_blank') return false;
      if (el.dataset.noPopover === 'true') return false;
      if (el.getAttribute('href')?.startsWith('#')) return false;
      return true;
    } catch { return false; }
  }

  function markBrokenLinks(root) {
    if (!indexReady) return;
    root.querySelectorAll('a[href]').forEach(link => {
      if (!isInternalLink(link)) return;
      if (!isPublished(link.href)) {
        link.classList.add('nd-broken');
        link.dataset.panelBound = 'skip';
      }
    });
  }

  function ensureRoot() {
    if (document.getElementById('panel-stack-root')) return;
    const root = document.createElement('div');
    root.id = 'panel-stack-root';
    document.body.appendChild(root);
  }

  async function openPanel(href, parentPanel) {
    const path = hrefToSlug(href);
    const dup = openPanels.find(p => p.path === path);
    if (dup) {
      dup.el.classList.add('panel-flash');
      dup.el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      setTimeout(() => dup.el.classList.remove('panel-flash'), 600);
      return;
    }
    if (parentPanel) {
      const idx = openPanels.findIndex(p => p === parentPanel);
      if (idx !== -1) {
        openPanels.slice(idx + 1).forEach(p => animateClose(p));
        openPanels = openPanels.slice(0, idx + 1);
      }
    }
    const el = document.createElement('div');
    el.className = 'stacked-panel panel-loading';
    el.innerHTML = '<div class="panel-header"><button class="panel-close" aria-label="Chiudi">✕</button><span class="panel-loading-title">Caricamento…</span></div><div class="panel-body"><div class="panel-spinner"></div></div>';
    document.getElementById('panel-stack-root').appendChild(el);
    void el.getBoundingClientRect();
    el.classList.add('panel-visible');
    el.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
    const panelData = { path, el };
    openPanels.push(panelData);
    el.querySelector('.panel-close').addEventListener('click', () => closeFrom(panelData));
    try {
      const res  = await fetch(href);
      const text = await res.text();
      const doc  = new DOMParser().parseFromString(text, 'text/html');
      const title = (
        doc.querySelector('h1.article-title')?.textContent?.trim() ||
        doc.querySelector('h1')?.textContent?.trim() ||
        doc.title?.split('·')[0]?.trim() || 'Nota'
      );
      const article = doc.querySelector('article') || doc.querySelector('.center') || doc.body;
      ['.left.sidebar','.right.sidebar','nav','footer','.toc','.backlinks',
       '.graph','.breadcrumb-container','.tags','.content-meta','#panel-stack-root'
      ].forEach(sel => article.querySelectorAll(sel).forEach(n => n.remove()));
      el.classList.remove('panel-loading');
      el.innerHTML = '<div class="panel-header"><button class="panel-close" aria-label="Chiudi">✕</button><a href="' + href + '" class="panel-title" title="' + title + '">' + title + '</a></div><div class="panel-body panel-content"></div>';
      el.querySelector('.panel-content').appendChild(article);
      el.querySelector('.panel-close').addEventListener('click', () => closeFrom(panelData));
      markBrokenLinks(el);
      bindLinks(el, panelData);
    } catch {
      el.querySelector('.panel-body').innerHTML = '<p class="panel-error">Impossibile caricare la nota.</p>';
    }
  }

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
      if (link.dataset.panelBound) return;
      if (!isPublished(link.href)) {
        link.classList.add('nd-broken');
        link.dataset.panelBound = 'skip';
        return;
      }
      bindLink(link, parentPanel);
    });
  }

  let mutationDebounce = null;
  const observer = new MutationObserver(() => {
    clearTimeout(mutationDebounce);
    mutationDebounce = setTimeout(() => {
      markBrokenLinks(document.body);
      bindLinks(document.body, null);
    }, 60);
  });

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

  document.addEventListener('nav', () => {
    ensureRoot();
    if (indexReady) { bindLinks(document.body, null); markBrokenLinks(document.body); }
  });
})();
`

export default (() => StackedPanels) satisfies QuartzComponentConstructor
