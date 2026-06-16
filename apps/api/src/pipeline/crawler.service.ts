/**
 * CrawlerService — Playwright + Cheerio 4-source reading passage crawler
 *
 * Sources (PIPE-01):
 *   - VOA Learning English (learningenglish.voanews.com)
 *   - BBC Learning English (bbc.co.uk/learningenglish)
 *   - News In Levels (newsinlevels.com)
 *   - Simple English Wikipedia (simple.wikipedia.org)
 *
 * Quality gate (PIPE-02):
 *   - ≥150 words per passage
 *   - Unique word ratio ≥ 0.4 (low ratio = boilerplate/nav content)
 *   - SHA-256 contentHash dedup
 *
 * Polite rate limiting: random delay 300–1200ms between page fetches (T-05-05-03)
 *
 * XSS threat (T-05-05-01): raw HTML stored in crawled-passages.json — SeedService
 * sanitizes via isomorphic-dompurify before Prisma createMany insert.
 */

import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cheerio from 'cheerio';
import type { Browser, Page } from 'playwright';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CrawledPassage {
  title: string;
  /** Raw inner HTML of article body. SeedService sanitizes before DB insert. */
  content: string;
  sourceUrl: string;
  contentHash: string;
  contentType: 'NEWS' | 'ARTICLE';
  wordCount: number;
}

export interface ValidationResult {
  source: string;
  successRate: number;
  bestSelector: string;
  sampleCount: number;
  successCount: number;
}

interface SourceConfig {
  name: string;
  contentType: 'NEWS' | 'ARTICLE';
  listingUrls: string[];
  articleSelectors: string[];
  /** Returns article URLs from a listing page HTML */
  extractArticleUrls: (html: string, baseUrl: string) => string[];
}

// ── Source configurations ────────────────────────────────────────────────────

const SOURCES: SourceConfig[] = [
  {
    name: 'VOA Learning English',
    contentType: 'NEWS',
    listingUrls: [
      'https://learningenglish.voanews.com/z/4729',
      'https://learningenglish.voanews.com/z/4730',
      'https://learningenglish.voanews.com/z/4731',
      'https://learningenglish.voanews.com/z/4732',
      'https://learningenglish.voanews.com/z/4752',
    ],
    articleSelectors: [
      '.content-body p',
      '.article-body p',
      '.article-content p',
      '.wsw p',
      'article p',
      '.body-block p',
    ],
    extractArticleUrls: (html: string, _baseUrl: string): string[] => {
      const $ = cheerio.load(html);
      const urls: string[] = [];
      $('a[href]').each((_i, el) => {
        const href = $(el).attr('href') ?? '';
        if (href.match(/\/a\/[a-z0-9-]+\/\d+\.html/i)) {
          const url = href.startsWith('http')
            ? href
            : `https://learningenglish.voanews.com${href}`;
          urls.push(url);
        }
      });
      return [...new Set(urls)];
    },
  },
  {
    name: 'BBC Learning English',
    contentType: 'NEWS',
    listingUrls: [
      'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
      'https://www.bbc.co.uk/learningenglish/english/features/english-at-work',
      'https://www.bbc.co.uk/learningenglish/english/features/the-english-we-speak',
      'https://www.bbc.co.uk/learningenglish/english/features/newsday',
    ],
    articleSelectors: [
      '.text p',
      '.story-body__inner p',
      '.body-content p',
      '.article__body p',
      'article p',
      '.widget-richtext p',
    ],
    extractArticleUrls: (html: string, _baseUrl: string): string[] => {
      const $ = cheerio.load(html);
      const urls: string[] = [];
      $('a[href]').each((_i, el) => {
        const href = $(el).attr('href') ?? '';
        if (
          href.includes('/learningenglish/') &&
          (href.includes('/features/') || href.includes('/english/'))
        ) {
          const url = href.startsWith('http')
            ? href
            : `https://www.bbc.co.uk${href}`;
          // Filter out top-level category pages
          if (url.split('/').length > 6) {
            urls.push(url);
          }
        }
      });
      return [...new Set(urls)];
    },
  },
  {
    name: 'News In Levels',
    contentType: 'NEWS',
    listingUrls: [
      'https://www.newsinlevels.com/level/level-1/',
      'https://www.newsinlevels.com/level/level-2/',
      'https://www.newsinlevels.com/level/level-3/',
      'https://www.newsinlevels.com/products/category/news/',
    ],
    articleSelectors: [
      '.entry-content p',
      '.post-content p',
      'article p',
      '.content p',
    ],
    extractArticleUrls: (html: string, _baseUrl: string): string[] => {
      const $ = cheerio.load(html);
      const urls: string[] = [];
      $('a[href]').each((_i, el) => {
        const href = $(el).attr('href') ?? '';
        if (
          href.includes('newsinlevels.com') &&
          href.match(/\/products\/[a-z0-9-]+\/$/)
        ) {
          urls.push(
            href.startsWith('http') ? href : `https://www.newsinlevels.com${href}`,
          );
        }
      });
      return [...new Set(urls)];
    },
  },
  {
    name: 'Simple English Wikipedia',
    contentType: 'ARTICLE',
    listingUrls: [
      'https://simple.wikipedia.org/wiki/Wikipedia:Good_articles',
      'https://simple.wikipedia.org/wiki/Wikipedia:Very_good_articles',
      'https://simple.wikipedia.org/wiki/Portal:Technology',
      'https://simple.wikipedia.org/wiki/Portal:Science',
      'https://simple.wikipedia.org/wiki/Portal:Society',
      'https://simple.wikipedia.org/wiki/Portal:History',
      'https://simple.wikipedia.org/wiki/Portal:Arts',
    ],
    articleSelectors: [
      '#mw-content-text p',
      '.mw-parser-output p',
    ],
    extractArticleUrls: (html: string, _baseUrl: string): string[] => {
      const $ = cheerio.load(html);
      const urls: string[] = [];
      $('a[href]').each((_i, el) => {
        const href = $(el).attr('href') ?? '';
        if (
          href.startsWith('/wiki/') &&
          !href.includes(':') &&
          !href.includes('#') &&
          href.length > 6
        ) {
          urls.push(`https://simple.wikipedia.org${href}`);
        }
      });
      return [...new Set(urls)];
    },
  },
];

// ── Utility functions ─────────────────────────────────────────────────────────

/**
 * Polite delay between page fetches (T-05-05-03).
 * Random 300–1200ms to avoid detectable fixed-interval patterns.
 */
async function politeDelay(minMs = 300, maxMs = 1200): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise<void>((resolve) => setTimeout(resolve, delay));
}

/**
 * Count words in plain text.
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Calculate unique word ratio. Low ratio (<0.4) indicates boilerplate/nav content.
 */
function uniqueWordRatio(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return 0;
  const unique = new Set(words).size;
  return unique / words.length;
}

/**
 * Compute SHA-256 hash of cleaned text content for deduplication (PIPE-02).
 */
function computeContentHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Strip HTML tags for plain text extraction (used in quality gate).
 * Preserves word boundaries by replacing tags with spaces.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Try multiple selectors against a Cheerio-loaded document.
 * Returns { selector, text, html, wordCount } for the first selector that yields ≥150 words.
 */
function trySelectors(
  $: ReturnType<typeof cheerio.load>,
  selectors: string[],
): { selector: string; text: string; html: string; wordCount: number } | null {
  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length === 0) continue;
    const htmlParts: string[] = [];
    elements.each((_i, el) => {
      htmlParts.push($.html(el) ?? '');
    });
    const combinedHtml = htmlParts.join('\n');
    const text = stripHtml(combinedHtml);
    const wc = countWords(text);
    if (wc >= 150) {
      return { selector, text, html: combinedHtml, wordCount: wc };
    }
  }
  return null;
}

// ── CrawlerService ─────────────────────────────────────────────────────────────

@Injectable()
export class CrawlerService {
  private readonly outputPath: string;

  constructor() {
    this.outputPath = path.join(process.cwd(), 'crawled-passages.json');
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * validateSelectors — MANDATORY first step before bulk crawl (D-11).
   *
   * For each source, fetch 50 sample URLs and test all selector candidates.
   * Reports per-source success rate. Warns if any source falls below 80%.
   * Returns the results for programmatic inspection.
   */
  async validateSelectors(): Promise<ValidationResult[]> {
    // Dynamic import — Playwright is a devDependency, loaded at runtime
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });

    const results: ValidationResult[] = [];

    for (const source of SOURCES) {
      console.log(`\n[Validator] Testing ${source.name}...`);
      const sampleUrls = await this.getSampleUrls(browser, source, 50);
      console.log(
        `[Validator] Got ${sampleUrls.length} sample URLs for ${source.name}`,
      );

      let successCount = 0;
      let bestSelector = source.articleSelectors[0] ?? '';
      const selectorSuccesses: Record<string, number> = {};

      for (const url of sampleUrls.slice(0, 50)) {
        try {
          const page = await browser.newPage();
          await page.setExtraHTTPHeaders({
            'User-Agent':
              'Mozilla/5.0 (compatible; EFL-Crawler/1.0; +https://github.com/example/efl-crawler)',
          });
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
          const html = await page.content();
          await page.close();

          const $ = cheerio.load(html);
          const result = trySelectors($, source.articleSelectors);

          if (result) {
            successCount++;
            selectorSuccesses[result.selector] =
              (selectorSuccesses[result.selector] ?? 0) + 1;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Validator] Failed to fetch ${url}: ${msg}`);
        }
        await politeDelay(300, 1200);
      }

      // Find best selector (most successes)
      if (Object.keys(selectorSuccesses).length > 0) {
        bestSelector =
          Object.entries(selectorSuccesses).sort(([, a], [, b]) => b - a)[0]?.[0] ??
          source.articleSelectors[0] ??
          '';
      }

      const successRate =
        sampleUrls.length > 0
          ? successCount / Math.min(sampleUrls.length, 50)
          : 0;

      const result: ValidationResult = {
        source: source.name,
        successRate,
        bestSelector,
        sampleCount: Math.min(sampleUrls.length, 50),
        successCount,
      };

      results.push(result);
      console.log(
        `[Validator] ${source.name}: ${(successRate * 100).toFixed(1)}% success rate` +
          ` (${successCount}/${result.sampleCount}), best selector: "${bestSelector}"`,
      );

      if (successRate < 0.8) {
        console.warn(
          `[Validator] WARNING: ${source.name} success rate (${(successRate * 100).toFixed(1)}%) ` +
            `is below 80% threshold. Manual selector inspection required before bulk crawl.`,
        );
      }
    }

    await browser.close();

    console.log('\n[Validator] Validation complete:');
    results.forEach((r) => {
      const status = r.successRate >= 0.8 ? 'PASS' : 'WARN';
      console.log(
        `  [${status}] ${r.source}: ${(r.successRate * 100).toFixed(1)}%` +
          ` | selector: "${r.bestSelector}"`,
      );
    });

    return results;
  }

  /**
   * crawlAll — Crawl all 4 sources and write passages to crawled-passages.json.
   *
   * Targets ≥625 URLs per source (4 × 625 = 2,500 raw → ~80% pass quality gate = ~2,000 seeded).
   * Applies quality gate: ≥150 words AND unique word ratio ≥ 0.4.
   * Computes SHA-256 contentHash for deduplication by SeedService.
   */
  async crawlAll(): Promise<void> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });

    const allPassages: CrawledPassage[] = [];
    const seenHashes = new Set<string>();
    const seenUrls = new Set<string>();

    for (const source of SOURCES) {
      console.log(`\n[Crawler] Starting ${source.name}...`);
      const sourcePassages = await this.crawlSource(
        browser,
        source,
        625,
        seenHashes,
        seenUrls,
      );
      allPassages.push(...sourcePassages);
      console.log(
        `[Crawler] ${source.name}: ${sourcePassages.length} passages collected`,
      );
    }

    await browser.close();

    // Write to output file
    fs.writeFileSync(
      this.outputPath,
      JSON.stringify(allPassages, null, 2),
      'utf8',
    );

    const totalWords = allPassages.reduce((sum, p) => sum + p.wordCount, 0);
    console.log(
      `\n[Crawler] Complete. ${allPassages.length} passages written to ${this.outputPath}` +
        ` (avg ${Math.round(totalWords / Math.max(1, allPassages.length))} words/passage)`,
    );
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Get sample article URLs from a source's listing pages.
   */
  private async getSampleUrls(
    browser: Browser,
    source: SourceConfig,
    targetCount: number,
  ): Promise<string[]> {
    const urls: string[] = [];

    if (source.name === 'Simple English Wikipedia') {
      const page = await browser.newPage();
      const wikiUrls = await this.getWikipediaRandomUrls(page, targetCount * 3);
      await page.close();
      return wikiUrls.slice(0, targetCount);
    }

    for (const listingUrl of source.listingUrls) {
      if (urls.length >= targetCount * 2) break;

      try {
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
          'User-Agent':
            'Mozilla/5.0 (compatible; EFL-Crawler/1.0; +https://github.com/example/efl-crawler)',
        });
        await page.goto(listingUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 15000,
        });
        const html = await page.content();
        const extracted = source.extractArticleUrls(html, listingUrl);
        urls.push(...extracted);
        await page.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Crawler] Failed to get URLs from ${listingUrl}: ${msg}`);
      }

      await politeDelay(300, 800);
    }

    return [...new Set(urls)];
  }

  /**
   * Generate Wikipedia article URLs by visiting Special:Random and topic portals.
   */
  private async getWikipediaRandomUrls(
    page: Page,
    count: number,
  ): Promise<string[]> {
    const urls: string[] = [];

    // Use Good/Very Good articles listing for quality content
    const goodArticlesPages = [
      'https://simple.wikipedia.org/wiki/Wikipedia:Good_articles',
      'https://simple.wikipedia.org/wiki/Wikipedia:Very_good_articles',
    ];

    for (const listPage of goodArticlesPages) {
      try {
        await page.goto(listPage, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const html = await page.content();
        const $ = cheerio.load(html);
        $('a[href]').each((_i, el) => {
          const href = $(el).attr('href') ?? '';
          if (
            href.startsWith('/wiki/') &&
            !href.includes(':') &&
            !href.includes('#') &&
            href.length > 6
          ) {
            urls.push(`https://simple.wikipedia.org${href}`);
          }
        });
        await politeDelay(300, 700);
      } catch {
        // skip
      }
    }

    // Fill with Special:Random if needed
    let attempts = 0;
    while (urls.length < count && attempts < count * 2) {
      attempts++;
      try {
        await page.goto('https://simple.wikipedia.org/wiki/Special:Random', {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });
        const currentUrl = page.url();
        if (
          currentUrl.includes('/wiki/') &&
          !currentUrl.includes('Special:') &&
          !currentUrl.includes('Wikipedia:') &&
          !currentUrl.includes('Portal:') &&
          !currentUrl.includes('Template:') &&
          !currentUrl.includes('Category:') &&
          !currentUrl.includes('File:')
        ) {
          urls.push(currentUrl);
        }
        await politeDelay(200, 500);
      } catch {
        // skip
      }
    }

    return [...new Set(urls)];
  }

  /**
   * Crawl a single source up to targetCount passages.
   */
  private async crawlSource(
    browser: Browser,
    source: SourceConfig,
    targetCount: number,
    seenHashes: Set<string>,
    seenUrls: Set<string>,
  ): Promise<CrawledPassage[]> {
    const passages: CrawledPassage[] = [];

    // Get article URLs (request more than needed to account for quality filtering)
    const articleUrls = await this.getSampleUrls(
      browser,
      source,
      targetCount * 2,
    );
    console.log(
      `[Crawler] ${source.name}: found ${articleUrls.length} candidate URLs`,
    );

    let fetched = 0;
    let passed = 0;
    let skippedQuality = 0;
    let skippedDupes = 0;

    for (const url of articleUrls) {
      if (passages.length >= targetCount) break;

      // URL dedup
      if (seenUrls.has(url)) {
        skippedDupes++;
        continue;
      }

      try {
        const page = await browser.newPage();
        await page.setExtraHTTPHeaders({
          'User-Agent':
            'Mozilla/5.0 (compatible; EFL-Crawler/1.0; +https://github.com/example/efl-crawler)',
        });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        const pageHtml = await page.content();
        const title = await page.title();
        await page.close();

        fetched++;

        const $ = cheerio.load(pageHtml);

        // Remove script and style from document before selector extraction
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();
        $('[class*="nav"]').remove();
        $('[class*="menu"]').remove();
        $('[class*="sidebar"]').remove();
        $('[class*="advertisement"]').remove();
        $('[class*="cookie"]').remove();

        const extracted = trySelectors($, source.articleSelectors);

        if (!extracted) {
          skippedQuality++;
          continue;
        }

        const { text, html, wordCount } = extracted;

        // Quality gate (PIPE-02): unique word ratio ≥ 0.4
        const uwRatio = uniqueWordRatio(text);
        if (uwRatio < 0.4) {
          skippedQuality++;
          continue;
        }

        // Content hash dedup (PIPE-02)
        const contentHash = computeContentHash(text);
        if (seenHashes.has(contentHash)) {
          skippedDupes++;
          continue;
        }

        seenHashes.add(contentHash);
        seenUrls.add(url);

        // Extract clean title from page title or h1
        let cleanTitle = title;
        const h1 = $('h1').first().text().trim();
        if (h1 && h1.length > 0 && h1.length < 200) {
          cleanTitle = h1;
        } else if (title.includes('|')) {
          cleanTitle = title.split('|')[0]?.trim() ?? title;
        } else if (title.includes('-')) {
          cleanTitle = title.split('-')[0]?.trim() ?? title;
        }

        passages.push({
          title: cleanTitle.slice(0, 500),
          content: html,
          sourceUrl: url,
          contentHash,
          contentType: source.contentType,
          wordCount,
        });

        passed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Crawler] Failed to fetch ${url}: ${msg}`);
      }

      // Polite delay between fetches (T-05-05-03)
      await politeDelay(300, 1200);

      if (fetched % 50 === 0 && fetched > 0) {
        console.log(
          `[Crawler] ${source.name}: fetched=${fetched}, passed=${passed},` +
            ` filtered=${skippedQuality}, dupes=${skippedDupes}`,
        );
      }
    }

    console.log(
      `[Crawler] ${source.name} done: fetched=${fetched}, passed=${passed},` +
        ` filtered=${skippedQuality}, dupes=${skippedDupes}`,
    );

    return passages;
  }
}
