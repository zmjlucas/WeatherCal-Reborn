import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectDocs } from '../scripts/check-docs.mjs';

test('built document links resolve under the project base in both languages', async () => {
  const root = await mkdtemp(join(tmpdir(), 'weathercal-docs-'));
  try {
    await mkdir(join(root, 'zh'));
    await mkdir(join(root, 'assets'));
    await writeFile(join(root, 'assets', 'site.css'), 'body{}');
    await writeFile(join(root, 'index.html'), '<html lang="en-US"><link href="/WeatherCal-Reborn/assets/site.css"><a href="/WeatherCal-Reborn/zh/#start">中文</a></html>');
    await writeFile(join(root, 'zh', 'index.html'), '<html lang="zh-CN"><h1 id="start">开始</h1><a href="../">English</a></html>');
    const result = await inspectDocs(root);
    assert.deepEqual(result.errors, []);
    assert.equal(result.pages, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('document validation reports broken files and heading anchors', async () => {
  const root = await mkdtemp(join(tmpdir(), 'weathercal-docs-'));
  try {
    await mkdir(join(root, 'zh'));
    await writeFile(join(root, 'index.html'), '<html lang="en-US"><a href="/WeatherCal-Reborn/zh/#missing">中文</a><img src="/WeatherCal-Reborn/missing.svg"></html>');
    await writeFile(join(root, 'zh', 'index.html'), '<html lang="zh-CN"></html>');
    const result = await inspectDocs(root);
    assert(result.errors.some((error: string) => error.includes('#missing')));
    assert(result.errors.some((error: string) => error.includes('missing.svg')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('document validation rejects root asset paths and missing locale pages', async () => {
  const root = await mkdtemp(join(tmpdir(), 'weathercal-docs-'));
  try {
    await mkdir(join(root, 'zh'));
    await writeFile(join(root, 'index.html'), '<html lang="en-US"><img src="/assets/site.svg"></html>');
    await writeFile(join(root, 'zh', 'index.html'), '<html lang="en-US"></html>');
    await writeFile(join(root, 'guide.html'), '<html lang="en-US"></html>');
    const result = await inspectDocs(root);
    assert(result.errors.some((error: string) => error.includes('project base')));
    assert(result.errors.some((error: string) => error.includes('zh/guide.html')));
    assert(result.errors.some((error: string) => error.includes('lang=zh-CN')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
