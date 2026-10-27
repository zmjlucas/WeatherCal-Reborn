import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Check generated pages, not Markdown spelling or theme implementation details. */
export async function inspectDocs(directory, base = '/WeatherCal-Reborn/') {
  const root = resolve(directory);
  const files = new Set((await readdir(root, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile())
    .map(entry => relative(root, join(entry.parentPath, entry.name)).split('\\').join('/')));
  const pages = new Map();
  const errors = [];
  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    const html = await readFile(join(root, file), 'utf8');
    pages.set(file, {
      html,
      ids: new Set([...html.matchAll(/\bid="([^"]*)"/g)].map(match => match[1])),
    });
  }
  if (!pages.has('index.html')) errors.push('Missing English index.html');
  if (!pages.has('zh/index.html')) errors.push('Missing Chinese zh/index.html');
  let links = 0;
  for (const [file, page] of pages) {
    const chinese = file.startsWith('zh/');
    const lang = chinese ? 'zh-CN' : 'en-US';
    if (!new RegExp(`<html\\b[^>]*\\blang="${lang}"`).test(page.html)) {
      errors.push(`${file}: expected lang=${lang}`);
    }
    if (file !== '404.html') {
      const counterpart = chinese ? file.slice(3) : `zh/${file}`;
      if (!pages.has(counterpart)) errors.push(`${file}: missing translation ${counterpart}`);
    }
    const pageUrl = new URL(`${base}${file}`, 'https://docs.invalid');
    for (const match of page.html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const value = match[1].replaceAll('&amp;', '&');
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) continue;
      const url = new URL(value, pageUrl);
      if (!url.pathname.startsWith(base)) {
        errors.push(`${file}: URL outside project base: ${value}`);
        continue;
      }
      links++;
      let target = decodeURIComponent(url.pathname.slice(base.length));
      if (!target || target.endsWith('/')) target += 'index.html';
      if (!files.has(target) && !posix.extname(target)) {
        target = files.has(`${target}.html`) ? `${target}.html` : `${target}/index.html`;
      }
      if (!files.has(target)) {
        errors.push(`${file}: missing file for ${value}`);
        continue;
      }
      if (url.hash && pages.has(target)) {
        const anchor = decodeURIComponent(url.hash.slice(1));
        if (anchor && !pages.get(target).ids.has(anchor)) errors.push(`${file}: missing anchor ${value}`);
      }
    }
  }
  return { pages: pages.size, links, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await inspectDocs(process.argv[2] ?? 'website/.vitepress/dist');
  for (const error of result.errors) console.error(error);
  console.log(`Docs output: ${result.pages} pages, ${result.links} local links/resources, ${result.errors.length} errors.`);
  if (result.errors.length) process.exitCode = 1;
}
