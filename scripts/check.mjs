import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = new URL('../dist/', import.meta.url);
const sitemap = await readFile(new URL('sitemap.xml',out),'utf8');
const files = (await readdir(out,{ recursive:true })).filter(name => name.endsWith('index.html'));
const index = new Map();
const labels = new Set();
const descriptions = new Set();

for (const file of files) {
  const html = await readFile(new URL(file,out),'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  const lang = html.match(/<html lang="([^"]+)"/)?.[1];
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/name="description" content="([^"]+)"/)?.[1];
  assert.ok(lang && canonical && title && description, `Missing SEO metadata in ${file}`);
  assert.ok(!index.has(canonical) && !labels.has(title) && !descriptions.has(description), `Duplicate SEO metadata in ${file}`);
  assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'), `Sitemap missing ${canonical}`);
  assert.equal((html.match(/<h1(?: |>)/g) || []).length, 1, `Expected one H1 in ${file}`);
  assert.ok(!/<script\b(?! type="application\/ld\+json")/.test(html), `Unexpected client script in ${file}`);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.+?)<\/script>/)[1]);
  assert.ok(ld['@graph'].some(item => item['@type']==='Person' && item.name==='Evans Moris Cheahn'));
  const alternates = new Map([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(([,key,url]) => [key,url]));
  assert.deepEqual([...alternates.keys()].sort(), ['en','id','x-default','zh-Hans']);
  assert.equal(alternates.get(lang),canonical);
  assert.equal(alternates.get('x-default'),alternates.get('id'));
  index.set(canonical,{ file, html, lang, alternates });
  labels.add(title);
  descriptions.add(description);
}

assert.equal(index.size,15);
assert.equal([...sitemap.matchAll(/<loc>/g)].length,index.size);
const home = new URL([...index].find(([,page]) => page.file==='index.html')[0]);
assert.ok((await readFile(new URL('robots.txt',out),'utf8')).includes(new URL('sitemap.xml',home).href));
for (const [url,{ html,file,lang,alternates }] of index) {
  for (const [otherLang,target] of alternates) {
    const other = index.get(target);
    assert.ok(other, `Missing alternate: ${target}`);
    assert.equal(other.lang, otherLang==='x-default'?'id':otherLang);
    assert.equal(other.alternates.get(lang),url,`Alternate lacks return link: ${target}`);
  }
  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = new URL(href.replaceAll('&amp;','&'), url);
    if (target.origin !== home.origin || !target.pathname.startsWith(home.pathname)) continue;
    const path = target.pathname.slice(home.pathname.length);
    const local = join(fileURLToPath(out),path.endsWith('/') || path===''?path+'index.html':path);
    assert.ok(existsSync(local), `Broken local link in ${file}: ${href}`);
    if (target.hash) {
      const targetHtml = target.pathname === new URL(url).pathname ? html : await readFile(local,'utf8');
      assert.ok(targetHtml.includes('id="'+target.hash.slice(1)+'"'), `Missing anchor in ${file}: ${href}`);
    }
  }
}
const notFound = await readFile(new URL('404.html',out),'utf8');
assert.ok(notFound.includes('content="noindex, follow"'));
console.log('Verified 15 static pages: local routes, anchors, metadata, hreflang, sitemap, and JSON-LD.');
