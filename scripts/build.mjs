import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const site = await json('content/site.json');
const locales = Object.keys(site.locales);
const pages = ['home', 'journey', 'ventures', 'media', 'contact'];
const dictionaries = Object.fromEntries(await Promise.all(locales.map(async locale => [locale, await json('content/'+locale+'.json')])));
const base = new URL(process.env.SITE_URL || site.siteUrl);
if (!['https:', 'http:'].includes(base.protocol) || base.search || base.hash || base.username || base.password) throw new Error('SITE_URL must be an HTTP(S) URL without credentials, query or fragment.');
if (!base.pathname.endsWith('/')) base.pathname += '/';
const siteName = site.name;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonLd = value => JSON.stringify(value).replaceAll('<','\\u003c');
const route = (locale, page) => site.locales[locale].path + (dictionaries[locale].pages[page].slug ? dictionaries[locale].pages[page].slug + '/' : '');
const absolute = path => new URL(path, base).href;
const rootHref = routePath => '../'.repeat(routePath.split('/').filter(Boolean).length) || './';
const pathFor = (locale, page) => absolute(route(locale, page));
const sources = site.sources;
const css = await readFile(new URL('public/assets/site.css', root));
const stylesheet = 'site.' + createHash('sha256').update(css).digest('hex').slice(0, 10) + '.css';
const svg = (paths, cls = '') => '<svg class="' + cls + '" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
const arrow = svg('<path d="M4 12h15m-6-6 6 6-6 6"/>');
const diagonal = svg('<path d="M6 18 18 6M8 6h10v10"/>');
const globe = svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>');
const pin = svg('<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>');
const icons = [
  svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 12 21 3m-5 0h5v5"/>'),
  svg('<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>'),
  svg('<circle cx="12" cy="6" r="2.5"/><circle cx="5" cy="16" r="2.5"/><circle cx="19" cy="16" r="2.5"/><path d="m10.5 8-4 6m7-6 4 6m-10 2h9"/>')
];
const button = (label, href, className = 'primary', icon = arrow) => '<a class="button '+className+'" href="'+escape(href)+'">'+escape(label)+icon+'</a>';
const link = (label, href, icon = arrow) => '<a class="text-link" href="'+escape(href)+'">'+escape(label)+icon+'</a>';
const external = (label, source) => link(label, sources[source], diagonal);
const sourceLink = (label, source, context) => '<a class="text-link" href="'+escape(sources[source])+'" aria-label="'+escape(label+': '+context)+'">'+escape(label)+diagonal+'</a>';
const label = value => '<p class="eyebrow">'+escape(value)+'</p>';
const wordmark = (href, footer = false) => '<a href="'+escape(href)+'" class="wordmark'+(footer?' footer-brand':'')+'"><span class="monogram" aria-hidden="true">EM<span>.</span></span><span>'+siteName+'</span></a>';

function context(locale, page, missing = false) {
  const d = dictionaries[locale];
  const rel = missing ? base.pathname : rootHref(route(locale, page));
  return { d, ui: d.ui, asset: name => rel+'assets/'+name, to: (target, lang = locale) => rel+route(lang, target), locale, page };
}

function header(c) {
  const { ui, d, to, page, locale } = c;
  return `<a class="skip" href="#main">${escape(ui.skip)}</a>
<header class="site-header" id="top">
  <div class="wrap header-inner">
    ${wordmark(to('home'))}
    <nav class="main-nav" aria-label="${escape(ui.navigation)}">${pages.map(p => `<a href="${to(p)}"${p===page?' aria-current="page"':''}>${escape(d.pages[p].label)}</a>`).join('')}</nav>
    <nav class="language-nav" aria-label="${escape(ui.languages)}">${globe}<div class="language-links">${locales.map(lang => `<a href="${to(page || 'home',lang)}" lang="${lang}" hreflang="${lang}" aria-label="${escape(site.locales[lang].short+' — '+site.locales[lang].label)}"${lang===locale?' aria-current="true"':''}>${escape(site.locales[lang].short)}</a>`).join('')}</div></nav>
  </div>
</header>`;
}

function footer(c) {
  return `<footer class="site-footer"><div class="wrap footer-inner"><div>${wordmark(c.to('home'),true)}<p>${escape(c.ui.footer)}</p></div>
    <div class="footer-links">${link('LinkedIn',site.linkedin,diagonal)} ${link(c.ui.top,'#top',svg('<path d="M12 20V4m-6 6 6-6 6 6"/>'))}</div></div></footer>`;
}

function cta(c) {
  const a = c.d.cta;
  return `<section class="site-cta"><div class="wrap cta-inner"><div>${label(a.label)}<h2>${escape(a.title)}</h2><p>${escape(a.text)}</p></div>${button(a.link,c.to('contact'),'light')}</div></section>`;
}

function pageIntro(data) {
  return `<section class="page-intro"><div class="wrap intro-inner">${label(data.label)}<h1>${escape(data.heading)}</h1><p>${escape(data.intro)}</p></div></section>`;
}

function next(c, pages) {
  return `<div class="wrap next-row">${label(c.ui.next)}<div>${pages.map(p => link(c.d.pages[p].label,c.to(p))).join('')}</div></div>`;
}

function home(c) {
  const { d, ui, to, asset } = c;
  const h = d.home;
  return `<section class="hero-shell" aria-labelledby="name"><div class="wrap hero">
  <div class="hero-copy">
    <p class="hero-kicker">${pin}${escape(ui.location)}</p>
    <h1 id="name">Evans Moris <span>Cheahn</span></h1>
    <p class="hero-role">${escape(h.role)}</p>
    <p class="hero-description">${escape(h.intro)}</p>
    <div class="actions">${button(h.primary,to('journey'))}${button(h.secondary,to('contact'),'secondary',diagonal)}</div>
  </div>
  <div class="portrait">
    <img width="400" height="400" src="${asset('evans-moris-cheahn-profile.webp')}" fetchpriority="high" alt="${escape(ui.portraitAlt)}">
  </div>
</div></section>
<div class="role-band"><div class="wrap role-inner">
  ${label(h.rolesLabel)}
  <ul>${d.ventures.entries.map((v,i) => `<li><a href="${to('ventures')}#role-${i+1}">${escape(v.name)}</a></li>`).join('')}</ul>
</div></div>
<section class="wrap section focus">
  <div class="section-heading">${label(h.focusLabel)}<h2>${escape(h.focusTitle)}</h2><p>${escape(h.focusIntro)}</p></div>
  <div class="tile-grid">${h.focus.map((f,i) => `<article class="tile"><span class="tile-icon">${icons[i]}</span><h3>${escape(f.title)}</h3><p>${escape(f.text)}</p></article>`).join('')}</div>
</section>
<section class="career-strip"><div class="wrap section">
  <div class="section-heading split"><div>${label(h.careerLabel)}<h2>${escape(h.careerTitle)}</h2></div>${link(h.careerLink,to('journey'))}</div>
  <ol class="milestones">${h.milestones.map(m => `<li><time datetime="${m.year}">${m.year}</time><h3>${escape(m.title)}</h3><p>${escape(m.text)}</p></li>`).join('')}</ol>
</div></section>
<section class="wrap section feature">
  <div class="feature-graphic"><img src="${asset('webdevtalk-2023.webp')}" width="900" height="473" alt="" loading="lazy" decoding="async"></div>
  <div>${label(h.featureLabel)}<h2>${escape(h.featureTitle)}</h2><p>${escape(h.featureText)}</p>${link(h.featureLink,to('media'))}</div>
</section>${cta(c)}`;
}

function journey(c) {
  const j = c.d.journey;
  return pageIntro(j)+`<section class="wrap section timeline-section" aria-label="${escape(c.d.pages.journey.label)}">
  <ol class="timeline">${j.entries.map(item => `<li><div class="timeline-period">${escape(item.period)}</div><article><p class="organization">${escape(item.organization)}</p><h2>${escape(item.title)}</h2><p>${escape(item.text)}</p>${sourceLink(c.ui.source,item.source,item.title)}</article></li>`).join('')}</ol>
</section>${next(c,['ventures','media'])}${cta(c)}`;
}

function ventures(c) {
  const v = c.d.ventures;
  return pageIntro(v)+`<section class="wrap section venture-list" aria-labelledby="current-roles"><h2 id="current-roles" class="eyebrow">${escape(v.current)}</h2>
  <div>${v.entries.map((item,i) => `<article class="venture-row" id="role-${i+1}">
    <div class="venture-identity"><span class="venture-mark mark-${i+1}" aria-hidden="true">${escape(item.mark)}</span><div><p class="organization">${escape(item.field)}</p><h3>${escape(item.name)}</h3><p class="role-date">${escape(item.role)} · ${escape(item.period)}</p></div></div>
    <div class="venture-detail"><p>${escape(item.text)}</p>${sourceLink(c.ui.source,item.source,item.name)}</div>
  </article>`).join('')}</div></section>
<section class="career-strip"><div class="wrap section">
  <div class="section-heading">${label(v.workLabel)}<h2>${escape(v.workTitle)}</h2></div>
  <div class="tile-grid">${v.work.map(item => `<article class="tile"><p class="organization">${escape(item.field)}</p><h3>${escape(item.name)}</h3><p>${escape(item.text)}</p>${sourceLink(c.ui.source,item.source,item.name)}</article>`).join('')}</div>
</div></section>${cta(c)}`;
}

function media(c) {
  const m = c.d.media;
  return pageIntro(m)+`<section class="wrap section">
  <article class="media-feature"><div class="media-copy">${label(m.feature.tag)}<h2>${escape(m.feature.title)}</h2><p>${escape(m.feature.text)}</p>
    <div class="media-links">${external(m.feature.primary,'iwa')}${external(m.feature.secondary,'komdigi')}</div></div>
    <div class="media-art"><img width="900" height="473" src="${c.asset('webdevtalk-2023.webp')}" alt="" decoding="async"><a href="${escape(sources.iwa)}">Exabytes · WebDevTalk 2023 ${diagonal}</a></div>
  </article>
  <h2 class="media-list-title">${escape(m.listTitle)}</h2>
  <div class="media-list">${m.entries.map(item => `<article><div class="media-date"><span>${escape(item.date)}</span><span>${escape(item.tag)}</span></div><div><p class="organization">${escape(item.publisher)}</p><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p>${sourceLink(c.ui.source,item.source,item.title)}</div></article>`).join('')}</div>
</section>${next(c,['journey','contact'])}`;
}

function contact(c) {
  const a = c.d.contact;
  return pageIntro(a)+`<section class="wrap section contact-grid">
  <article class="contact-card">${label(c.ui.profile)}<h2>${escape(a.channel)}</h2><p>${escape(a.channelText)}</p>${button(c.ui.linkedin,site.linkedin,'primary',diagonal)}</article>
  <div class="contact-topics"><h2>${escape(a.topicsTitle)}</h2><ul>${a.topics.map(item => `<li><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></li>`).join('')}</ul></div>
</section>${next(c,['ventures','media'])}`;
}

const render = { home, journey, ventures, media, contact };
function structured(c, meta, canonical) {
  const person = { '@type': 'Person', '@id': absolute('#evans-moris-cheahn'), name: siteName, url: base.href, image: absolute('assets/evans-moris-cheahn-profile.webp'), sameAs: [site.linkedin], jobTitle: c.ui.footer };
  const webSite = { '@type':'WebSite', '@id': absolute('#website'), url: base.href, name: siteName, inLanguage: locales };
  const profile = { '@type': c.page === 'home' ? 'ProfilePage' : c.page === 'contact' ? 'ContactPage' : 'WebPage', '@id': canonical+'#page', url: canonical, name: meta.title, description: meta.description, inLanguage: c.locale, isPartOf: { '@id':webSite['@id'] }, [c.page==='home'?'mainEntity':'about']: { '@id':person['@id'] } };
  const graph = [person,webSite,profile];
  if (c.page !== 'home') {
    const crumbs = { '@type':'BreadcrumbList', '@id':canonical+'#breadcrumbs', itemListElement:[
      { '@type':'ListItem',position:1,name:c.d.pages.home.label,item:pathFor(c.locale,'home') },
      { '@type':'ListItem',position:2,name:meta.label,item:canonical }
    ] };
    profile.breadcrumb = { '@id':crumbs['@id'] };
    graph.push(crumbs);
  }
  return { '@context':'https://schema.org','@graph':graph };
}

function head(c, missing) {
  const { d, locale, page, asset } = c;
  const meta = missing ? { title:d.missing.title+' | '+siteName, description:d.missing.text } : d.pages[page];
  const canonical = missing ? '' : pathFor(locale,page);
  const social = absolute('assets/evans-moris-cheahn-social.jpg');
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(meta.title)}</title>
<meta name="description" content="${escape(meta.description)}">
<meta name="theme-color" content="#f1f8ff">
<meta name="robots" content="${missing?'noindex, follow':'index, follow, max-image-preview:large'}">
<link rel="icon" href="${asset('mark.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${asset(stylesheet)}">
${page==='home'?`<link rel="preload" href="${asset('plus-jakarta-sans-latin-wght-normal.woff2')}" as="font" type="font/woff2" crossorigin>`:''}
${missing?'':`<link rel="canonical" href="${escape(canonical)}">
${locales.map(lang=>`<link rel="alternate" hreflang="${lang}" href="${escape(pathFor(lang,page))}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${escape(pathFor(site.defaultLocale,page))}">
<meta property="og:type" content="${page==='home'?'profile':'website'}">
<meta property="og:site_name" content="${siteName}">
<meta property="og:title" content="${escape(meta.title)}">
<meta property="og:description" content="${escape(meta.description)}">
<meta property="og:url" content="${escape(canonical)}">
<meta property="og:locale" content="${site.locales[locale].og}">
${locales.filter(lang=>lang!==locale).map(lang=>`<meta property="og:locale:alternate" content="${site.locales[lang].og}">`).join('\n')}
<meta property="og:image" content="${escape(social)}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escape(c.ui.socialAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(meta.title)}">
<meta name="twitter:description" content="${escape(meta.description)}">
<meta name="twitter:image" content="${escape(social)}">
<meta name="twitter:image:alt" content="${escape(c.ui.socialAlt)}">
<script type="application/ld+json">${jsonLd(structured(c,meta,canonical))}</script>`}`;
}

function document(c, missing = false) {
  return `<!doctype html>
<html lang="${c.locale}">
<head>
${head(c,missing)}
</head>
<body>
${header(c)}
<main id="main">${missing?`<section class="wrap section error-page">${label('404')}<h1>${escape(c.d.missing.title)}</h1><p>${escape(c.d.missing.text)}</p>${button(c.d.pages.home.label,c.to('home'))}</section>`:render[c.page](c)}</main>
${footer(c)}
</body>
</html>
`;
}

await rm(output,{ recursive:true, force:true });
await mkdir(output,{ recursive:true });
await cp(new URL('public/',root),output,{ recursive:true, filter:src=>!src.endsWith('/site.css') });
await writeFile(new URL('assets/'+stylesheet,output),css);

const urls = [];
for (const locale of locales) for (const page of pages) {
  const path = route(locale,page);
  const dir = new URL(path,output);
  await mkdir(dir,{ recursive:true });
  await writeFile(new URL('index.html',dir),document(context(locale,page)));
  urls.push(pathFor(locale,page));
}
const notFound = document(context(site.defaultLocale,null,true),true);
// A 404 can be served for any depth, so its links must be relative to the site's base path.
await writeFile(new URL('404.html',output),notFound);
await writeFile(new URL('.nojekyll',output),'');
await writeFile(new URL('sitemap.xml',output),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${escape(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
await writeFile(new URL('robots.txt',output),`User-agent: *\nAllow: /\n\nSitemap: ${absolute('sitemap.xml')}\n`);
console.log(`Built ${urls.length} static pages for ${base.href}`);
