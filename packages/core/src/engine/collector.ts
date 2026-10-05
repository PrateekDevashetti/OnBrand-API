/**
 * Runs inside the page. Kept as a plain JS string so bundlers can't inject helpers.
 * Returns PageSignals (see signals.ts).
 */
export const COLLECTOR_SOURCE = String.raw`
(() => {
  const MAX_ELEMENTS = 4000;
  const vw = window.innerWidth, vh = window.innerHeight;
  const docH = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);

  const toHex = (c) => {
    if (!c) return null;
    const m = c.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/);
    if (!m) {
      if (/^#[0-9a-f]{3,8}$/i.test(c)) return { hex: c.toUpperCase(), a: 1 };
      return null;
    }
    let a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    const h = (n) => Math.max(0, Math.min(255, Math.round(parseFloat(n)))).toString(16).padStart(2, '0');
    return { hex: ('#' + h(m[1]) + h(m[2]) + h(m[3])).toUpperCase(), a };
  };

  const colorMap = new Map();
  const addColor = (raw, weight, ctx) => {
    const c = toHex(raw);
    if (!c || c.a < 0.08) return;
    const key = c.hex + (c.a < 1 ? '@' + Math.round(c.a * 100) : '');
    const e = colorMap.get(key) || { hex: c.hex, alpha: Math.round(c.a * 100) / 100, weight: 0, text: 0, bg: 0, border: 0, count: 0 };
    e.weight += weight; e[ctx] += weight; e.count++;
    colorMap.set(key, e);
  };

  const tally = (map, key, w, extra) => {
    if (!key) return;
    const e = map.get(key) || Object.assign({ value: key, count: 0, weight: 0 }, extra || {});
    e.count++; e.weight += (w || 1);
    map.set(key, e);
  };

  const textStyleMap = new Map();
  const shadowMap = new Map(), borderMap = new Map(), radiusMap = new Map(), transitionMap = new Map(),
        gradientMap = new Map(), spacingMap = new Map(), backdropMap = new Map(), animMap = new Map();

  const isVisible = (el, r, cs) => {
    if (r.width < 2 || r.height < 2) return false;
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return false;
    return true;
  };

  const ownText = (el) => {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.textContent;
    return t.replace(/\s+/g, ' ').trim();
  };

  // Page canvas: body/html backgrounds paint the whole viewport but aren't in 'body *'.
  {
    const bodyBg = toHex(getComputedStyle(document.body).backgroundColor);
    const htmlBg = toHex(getComputedStyle(document.documentElement).backgroundColor);
    const canvas = bodyBg && bodyBg.a > 0.5 ? getComputedStyle(document.body).backgroundColor : htmlBg && htmlBg.a > 0.5 ? getComputedStyle(document.documentElement).backgroundColor : 'rgb(255, 255, 255)';
    addColor(canvas, 12, 'bg');
  }
  const all = Array.from(document.querySelectorAll('body *')).slice(0, MAX_ELEMENTS * 3);
  let processed = 0;
  for (const el of all) {
    if (processed > MAX_ELEMENTS) break;
    const tag = el.tagName.toLowerCase();
    if (['script','style','noscript','meta','link','head','br','template'].includes(tag)) continue;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!isVisible(el, r, cs)) continue;
    processed++;
    const absTop = r.top + window.scrollY;
    const area = Math.min(r.width * r.height, vw * vh * 2);
    const areaW = area / (vw * vh);
    // backgrounds
    addColor(cs.backgroundColor, areaW * 10, 'bg');
    const bgi = cs.backgroundImage;
    if (bgi && bgi.includes('gradient')) tally(gradientMap, bgi.slice(0, 400), areaW * 10, { sample: tag + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') });
    // text
    const txt = ownText(el);
    if (txt.length > 0) {
      const w = Math.min(txt.length, 400) / 40;
      addColor(cs.color, w, 'text');
      const fam = cs.fontFamily;
      const key = [tag, fam, cs.fontSize, cs.fontWeight, cs.lineHeight, cs.letterSpacing, cs.textTransform].join('|');
      const e = textStyleMap.get(key) || {
        tag, family: fam, size: cs.fontSize, weight: cs.fontWeight, lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing, transform: cs.textTransform, color: (toHex(cs.color)||{}).hex,
        count: 0, chars: 0, sample: txt.slice(0, 80), top: Math.round(absTop)
      };
      e.count++; e.chars += txt.length;
      textStyleMap.set(key, e);
    }
    // borders
    for (const side of ['Top','Right','Bottom','Left']) {
      const bw = parseFloat(cs['border' + side + 'Width']);
      if (bw > 0 && cs['border' + side + 'Style'] !== 'none') {
        const c = toHex(cs['border' + side + 'Color']);
        if (c && c.a > 0.04) {
          addColor(cs['border' + side + 'Color'], 0.2, 'border');
          const alpha = c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2,'0').toUpperCase() : '';
          tally(borderMap, bw + 'px ' + cs['border' + side + 'Style'] + ' ' + c.hex + alpha, 1);
        }
        break;
      }
    }
    if (cs.boxShadow && cs.boxShadow !== 'none') tally(shadowMap, cs.boxShadow, 1);
    if (cs.borderRadius && cs.borderRadius !== '0px') tally(radiusMap, cs.borderRadius, 1);
    if (cs.transitionProperty && cs.transitionDuration && cs.transitionDuration !== '0s') {
      tally(transitionMap, 'transition: ' + cs.transitionProperty + ' ' + cs.transitionDuration + ' ' + cs.transitionTimingFunction, 1);
    }
    if (cs.animationName && cs.animationName !== 'none') tally(animMap, cs.animationName + ' ' + cs.animationDuration + ' ' + cs.animationTimingFunction, 1);
    const bf = cs.backdropFilter || cs.webkitBackdropFilter;
    if (bf && bf !== 'none') tally(backdropMap, bf, 1);
    for (const p of ['paddingTop','paddingLeft','marginBottom','gap','rowGap']) {
      const v = cs[p];
      if (v && v !== '0px' && v !== 'normal' && parseFloat(v) >= 4) tally(spacingMap, v, 1);
    }
  }

  // --- custom properties from :root
  const cssVars = [];
  const rootCs = getComputedStyle(document.documentElement);
  const keyframes = [], mediaQueries = new Set(), fontFaces = [];
  const walk = (rules, depth) => {
    for (const rule of rules) {
      try {
        if (rule.type === 1 && (rule.selectorText === ':root' || rule.selectorText === 'html' || rule.selectorText === ':root, :host')) {
          for (const name of rule.style) if (name.startsWith('--')) cssVars.push({ name, value: rootCs.getPropertyValue(name).trim() || rule.style.getPropertyValue(name).trim() });
        } else if (rule.type === 7) {
          keyframes.push({ name: rule.name, css: rule.cssText.slice(0, 600) });
        } else if (rule.type === 4) {
          mediaQueries.add(rule.conditionText || rule.media.mediaText);
          if (depth < 3) walk(rule.cssRules, depth + 1);
        } else if (rule.type === 5) {
          fontFaces.push({ family: rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim(), weight: rule.style.getPropertyValue('font-weight'), src: rule.style.getPropertyValue('src').slice(0, 400) });
        } else if (rule.cssRules && depth < 3) {
          walk(rule.cssRules, depth + 1);
        }
      } catch (e) {}
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { walk(sheet.cssRules, 0); } catch (e) {}
  }

  // --- buttons / CTAs
  const hasBox = (cs) => { const bg = toHex(cs.backgroundColor); const bw = parseFloat(cs.borderTopWidth); return (bg && bg.a > 0.04) || (bw > 0 && cs.borderTopStyle !== 'none') || (cs.backgroundImage && cs.backgroundImage !== 'none'); };
  const styledBox = (el) => {
    if (hasBox(getComputedStyle(el))) return el;
    const r0 = el.getBoundingClientRect();
    for (const c of Array.from(el.querySelectorAll('div, span'))) {
      const r = c.getBoundingClientRect();
      if (r.width >= r0.width * 0.6 && r.height >= r0.height * 0.6 && hasBox(getComputedStyle(c))) return c;
    }
    return el;
  };
  const btnEls = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'))
    .filter((el) => {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (!isVisible(el, r, cs) || r.width > 520 || r.height > 120 || r.height < 18) return false;
      const t = (el.innerText || el.value || '').trim();
      if (!t || t.length > 48) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'button' || tag === 'input') return true;
      return hasBox(getComputedStyle(styledBox(el))) || /btn|button|cta/i.test(String(el.className));
    })
    .slice(0, 60);
  const pickCss = (cs) => ({
    color: cs.color, backgroundColor: cs.backgroundColor, backgroundImage: cs.backgroundImage === 'none' ? '' : cs.backgroundImage.slice(0, 200),
    border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, borderRadius: cs.borderRadius,
    padding: cs.padding, fontFamily: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
    letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, boxShadow: cs.boxShadow === 'none' ? '' : cs.boxShadow,
    transition: cs.transition, height: Math.round(parseFloat(cs.height)) + 'px'
  });
  const effectiveBg = (el) => {
    let n = el.parentElement;
    while (n) { const c = toHex(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c.hex; n = n.parentElement; }
    return '#FFFFFF';
  };
  const seenBtn = new Set();
  const buttons = [];
  btnEls.forEach((el) => {
    if (buttons.length >= 16) return;
    const box = styledBox(el);
    const cs = getComputedStyle(box);
    const tcs = getComputedStyle(el.querySelector('div, span') || el);
    const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const sig = [cs.backgroundColor, cs.color, cs.borderTopColor, cs.borderTopWidth, cs.borderRadius, cs.fontSize].join('|');
    if (seenBtn.has(sig)) return;
    seenBtn.add(sig);
    box.setAttribute('data-onbrand-btn', String(buttons.length));
    const css = pickCss(cs);
    if (box !== el) { css.fontFamily = tcs.fontFamily; css.fontSize = tcs.fontSize; css.fontWeight = tcs.fontWeight; css.color = tcs.color; }
    buttons.push({ index: buttons.length, text, tag: el.tagName.toLowerCase(), css, parentBg: effectiveBg(box), top: Math.round(el.getBoundingClientRect().top + window.scrollY) });
  });

  // --- inputs
  const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input:not([type]), textarea, select'))
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 10; })
    .slice(0, 6).map((el) => ({ placeholder: el.getAttribute('placeholder') || '', css: pickCss(getComputedStyle(el)) }));

  // --- navigation
  const findHeader = () => {
    const h = document.querySelector('header');
    if (h && h.getBoundingClientRect().height > 30) return h;
    const tops = Array.from(document.querySelectorAll('body *')).filter((e) => {
      const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
      return (cs.position === 'fixed' || cs.position === 'sticky') && r.top <= 2 && r.width >= vw * 0.7 && r.height >= 30 && r.height <= 200 && e.querySelector('a');
    });
    if (tops.length) return tops[0];
    const navs = Array.from(document.querySelectorAll('nav, [class*="nav" i], [class*="header" i]')).filter((e) => { const r = e.getBoundingClientRect(); return r.top + window.scrollY < 150 && r.width >= vw * 0.7 && r.height >= 30 && r.height <= 220; });
    return navs[0] || h || document.querySelector('nav');
  };
  const header = findHeader();
  let nav = null;
  if (header) {
    const r = header.getBoundingClientRect();
    const cs = getComputedStyle(header);
    let bg = toHex(cs.backgroundColor);
    if (!bg || bg.a < 0.1) bg = { hex: effectiveBg(header), a: 1 };
    nav = {
      height: r.height.toFixed(2) + 'px', position: cs.position, background: bg.hex, backdrop: cs.backdropFilter || '',
      links: Array.from(header.querySelectorAll('a')).map((a) => (a.innerText || '').trim()).filter((t) => t && t.length < 40).slice(0, 14),
    };
  }

  // --- logo
  const pickLogo = () => {
    const scope = header || document.body;
    const cands = Array.from(scope.querySelectorAll('a[href="/"], a[href="./"], a[aria-label*="home" i], [class*="logo" i], [id*="logo" i], img[alt*="logo" i]'));
    for (const c of cands) {
      const svg = c.tagName.toLowerCase() === 'svg' ? c : c.querySelector('svg');
      const img = c.tagName.toLowerCase() === 'img' ? c : c.querySelector('img');
      if (svg) {
        const r = svg.getBoundingClientRect();
        if (r.width > 12 && r.height > 8) {
          const clone = svg.cloneNode(true);
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const fill = getComputedStyle(svg).color;
          return { kind: 'svg', svg: clone.outerHTML.replace(/currentColor/g, fill).slice(0, 60000), alt: svg.getAttribute('aria-label') || '', w: r.width, h: r.height };
        }
      }
      if (img && img.currentSrc) {
        const r = img.getBoundingClientRect();
        if (r.width > 12) return { kind: 'img', src: img.currentSrc, alt: img.alt || '', w: r.width, h: r.height };
      }
    }
    if (header) {
      const hr = header.getBoundingClientRect();
      for (const m of Array.from(header.querySelectorAll('img, svg'))) {
        const r = m.getBoundingClientRect();
        if (r.width > 20 && r.height > 8 && r.left < hr.left + hr.width * 0.35) {
          if (m.tagName.toLowerCase() === 'img') return { kind: 'img', src: m.currentSrc || m.src, alt: m.alt || '', w: r.width, h: r.height };
          const clone = m.cloneNode(true); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          return { kind: 'svg', svg: clone.outerHTML.replace(/currentColor/g, getComputedStyle(m).color).slice(0, 60000), alt: '', w: r.width, h: r.height };
        }
      }
    }
    return null;
  };
  const logo = pickLogo();

  // --- icons (small inline svgs)
  const icons = [];
  const seenIcon = new Set();
  for (const svg of Array.from(document.querySelectorAll('svg'))) {
    if (icons.length >= 24) break;
    const r = svg.getBoundingClientRect();
    if (r.width < 8 || r.width > 64 || r.height > 64) continue;
    const html = svg.outerHTML;
    if (html.length > 6000) continue;
    const key = html.replace(/\s+/g, '').slice(0, 300);
    if (seenIcon.has(key)) continue;
    seenIcon.add(key);
    const label = svg.getAttribute('aria-label') || (svg.closest('[aria-label]') || {}).getAttribute?.call(svg.closest('[aria-label]'), 'aria-label') || (svg.parentElement && svg.parentElement.innerText || '').trim().slice(0, 30);
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    icons.push({ svg: clone.outerHTML.replace(/currentColor/g, getComputedStyle(svg).color), w: Math.round(r.width), h: Math.round(r.height), label: label || '', fill: getComputedStyle(svg).fill, stroke: getComputedStyle(svg).stroke });
  }

  // --- media
  const media = [];
  for (const v of Array.from(document.querySelectorAll('video'))) {
    const src = v.currentSrc || (v.querySelector('source') || {}).src || '';
    if (src) media.push({ kind: 'video', src, poster: v.poster || '', alt: v.getAttribute('aria-label') || '', w: v.clientWidth, h: v.clientHeight });
  }
  const seenImg = new Set();
  for (const img of Array.from(document.querySelectorAll('img'))) {
    if (media.length > 40) break;
    const src = img.currentSrc || img.src;
    if (!src || seenImg.has(src) || src.startsWith('data:image/gif')) continue;
    const r = img.getBoundingClientRect();
    if (r.width < 24 && img.naturalWidth < 24) continue;
    seenImg.add(src);
    media.push({ kind: src.endsWith('.svg') ? 'illustration' : 'image', src, alt: img.alt || '', w: Math.round(r.width) || img.naturalWidth, h: Math.round(r.height) || img.naturalHeight });
  }

  // --- sections (top-level blocks)
  const sectionEls = [];
  // Find the level where the page actually splits into stacked full-width blocks.
  const main = document.querySelector('main') || document.body;
  const bigKids = (el) => Array.from(el.children).filter((c) => { const r = c.getBoundingClientRect(); return r.height >= 60 && r.width >= vw * 0.5; });
  let container = main;
  for (let i = 0; i < 4 && bigKids(container).length < 3; i++) {
    const kids = bigKids(container);
    if (kids.length !== 1) break;
    container = kids[0];
  }
  let consider = bigKids(container);
  if (consider.length < 3) consider = Array.from(document.querySelectorAll('section'));
  for (const el of consider.concat(Array.from(document.querySelectorAll('footer')))) {
    const r = el.getBoundingClientRect();
    if (r.height < 60 || r.width < vw * 0.5) continue;
    const cs = getComputedStyle(el);
    let bg = toHex(cs.backgroundColor);
    if (!bg || bg.a < 0.1) bg = { hex: effectiveBg(el.firstElementChild || el), a: 1 };
    const h = el.querySelector('h1, h2, h3');
    sectionEls.push({
      tag: el.tagName.toLowerCase(), top: Math.round(r.top + window.scrollY), height: Math.round(r.height), bg: bg.hex,
      headline: h ? h.innerText.replace(/\s+/g, ' ').trim().slice(0, 140) : '',
      text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 280),
      counts: { img: el.querySelectorAll('img').length, video: el.querySelectorAll('video').length, button: el.querySelectorAll('button, a[class*="btn" i]').length, link: el.querySelectorAll('a').length, input: el.querySelectorAll('input, textarea').length, svg: el.querySelectorAll('svg').length, canvas: el.querySelectorAll('canvas').length }
    });
    if (sectionEls.length >= 18) break;
  }

  const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 30).map((h) => ({ level: h.tagName.toLowerCase(), text: h.innerText.replace(/\s+/g, ' ').trim().slice(0, 160) })).filter((h) => h.text);

  const sameHost = location.host;
  const links = Array.from(new Set(Array.from(document.querySelectorAll('a[href]')).map((a) => a.href.split('#')[0]).filter((h) => { try { const u = new URL(h); return u.host === sameHost && !/\.(pdf|png|jpe?g|zip|svg|mp4)$/i.test(u.pathname); } catch (e) { return false; } }))).slice(0, 80);

  const meta = (n) => (document.querySelector('meta[name="' + n + '"], meta[property="' + n + '"]') || {}).content || '';
  const iconLink = document.querySelector('link[rel~="icon"]');

  const loadedFonts = [];
  try { document.fonts.forEach((f) => { if (f.status === 'loaded') loadedFonts.push(f.family.replace(/["']/g, '') + ' ' + f.weight); }); } catch (e) {}

  const sortW = (m, n) => Array.from(m.values()).sort((a, b) => b.weight - a.weight).slice(0, n);
  return {
    url: location.href,
    title: document.title,
    description: meta('description') || meta('og:description'),
    ogImage: meta('og:image'),
    siteName: meta('og:site_name') || meta('application-name'),
    favicon: iconLink ? iconLink.href : (location.origin + '/favicon.ico'),
    lang: document.documentElement.lang || '',
    viewport: { w: vw, h: vh },
    docHeight: docH,
    colors: Array.from(colorMap.values()).sort((a, b) => b.weight - a.weight).slice(0, 60),
    textStyles: Array.from(textStyleMap.values()).sort((a, b) => b.chars - a.chars).slice(0, 60),
    cssVars: cssVars.slice(0, 200),
    keyframes: keyframes.slice(0, 30),
    mediaQueries: Array.from(mediaQueries).slice(0, 40),
    fontFaces: fontFaces.slice(0, 40),
    loadedFonts: Array.from(new Set(loadedFonts)).slice(0, 30),
    shadows: sortW(shadowMap, 15),
    borders: sortW(borderMap, 15),
    radii: sortW(radiusMap, 12),
    transitions: sortW(transitionMap, 15),
    animations: sortW(animMap, 15),
    gradients: sortW(gradientMap, 12),
    backdrops: sortW(backdropMap, 6),
    spacing: sortW(spacingMap, 20),
    buttons, inputs, nav, logo, icons, media: media.slice(0, 40),
    sections: sectionEls, headings, links,
    text: (document.body.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 6000),
  };
})()
`;

/** Computes the hover-state style of a tagged button. */
export const HOVER_READ_SOURCE = String.raw`
((i) => {
  const el = document.querySelector('[data-onbrand-btn="' + i + '"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return { color: cs.color, backgroundColor: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor, boxShadow: cs.boxShadow === 'none' ? '' : cs.boxShadow, opacity: cs.opacity, transform: cs.transform === 'none' ? '' : cs.transform };
})
`;
