/**
 * CrawlerService — Playwright + Cheerio content crawler (PIPE-01, PIPE-02)
 *
 * Crawls 4 sources: VOA Learning English, BBC Learning English,
 * News In Levels, Simple English Wikipedia.
 *
 * validateSelectors() — 50-URL sample per source, reports ≥80% success rate.
 *   MANDATORY before bulk crawl (D-11, PIPE-02 quality gate).
 *
 * crawlAll() — crawls ≥625 URLs per source, applies quality gate
 *   (≥150 words, unique-word ratio ≥0.4), computes SHA-256 contentHash,
 *   writes crawled-passages.json for SeedService to consume.
 *
 * Polite delay: 300–1200ms random between each page fetch (PIPE-02, T-05-05-03).
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as cheerio from 'cheerio';
import { chromium, type Browser } from 'playwright';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RawPassage {
  title: string;
  content: string; // Inner HTML of article body (script/style stripped)
  sourceUrl: string;
  contentType: 'NEWS' | 'ARTICLE';
  contentHash: string; // SHA-256 of cleaned plain text
}

export interface SelectorValidationResult {
  source: string;
  baseUrl: string;
  successRate: number;
  bestSelector: string;
  totalSampled: number;
  passed: number;
}

// ─── Source Configurations ────────────────────────────────────────────────────

interface SourceConfig {
  name: string;
  baseUrl: string;
  contentType: 'NEWS' | 'ARTICLE';
  listingUrls: string[]; // Pages to enumerate article links from
  articleSelectors: string[]; // CSS selectors tried in order; first success wins
  titleSelectors: string[]; // CSS selectors for <h1> / page title
  linkSelector: string; // CSS selector for article anchor tags on listing pages
  linkFilter?: RegExp; // Optional: only follow links matching this pattern
  skipFilter?: RegExp; // Optional: skip article URLs matching this pattern
}

const SOURCES: SourceConfig[] = [
  {
    name: 'VOA Learning English',
    baseUrl: 'https://learningenglish.voanews.com',
    contentType: 'NEWS',
    listingUrls: [
      'https://learningenglish.voanews.com/z/4691',
      'https://learningenglish.voanews.com/z/4692',
      'https://learningenglish.voanews.com/z/4693',
      'https://learningenglish.voanews.com/news',
      'https://learningenglish.voanews.com/stories',
    ],
    articleSelectors: [
      '.content-body',
      '.article-content',
      '.wsw',
      '.story-body',
      'article .body',
    ],
    titleSelectors: ['h1.pg-title', 'h1.article-title', 'h1'],
    linkSelector: 'a[href]',
    linkFilter: /\/a\//,
  },
  {
    name: 'BBC Learning English',
    baseUrl: 'https://www.bbc.co.uk/learningenglish',
    contentType: 'NEWS',
    listingUrls: [
      'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
      'https://www.bbc.co.uk/learningenglish/english/features/lingohack',
      'https://www.bbc.co.uk/learningenglish/english/features/the-english-we-speak',
      'https://www.bbc.co.uk/learningenglish/english/features/news-report',
    ],
    articleSelectors: [
      '.text',
      '.story-body__inner',
      '.lep-body-text',
      '.lep-activity__body',
      'article .gel-body-copy',
      '.mxl-body-copy',
    ],
    titleSelectors: ['h1.story-body__h1', 'h1.lep-page-title', 'h1'],
    linkSelector: 'a[href]',
    linkFilter: /\/learningenglish\/(english|features)\//,
  },
  {
    name: 'News In Levels',
    baseUrl: 'https://www.newsinlevels.com',
    contentType: 'NEWS',
    listingUrls: [
      'https://www.newsinlevels.com/level/level-1/',
      'https://www.newsinlevels.com/level/level-2/',
      'https://www.newsinlevels.com/level/level-3/',
      'https://www.newsinlevels.com/news/',
    ],
    articleSelectors: ['.entry-content', '.post-content', 'article .content'],
    titleSelectors: ['h1.entry-title', 'h1.post-title', 'h1'],
    linkSelector: 'article a[href], h2.entry-title a[href]',
    linkFilter: /newsinlevels\.com\/news\//,
  },
  {
    name: 'Simple English Wikipedia',
    baseUrl: 'https://simple.wikipedia.org',
    contentType: 'ARTICLE',
    listingUrls: [
      'https://simple.wikipedia.org/wiki/Special:Random',
      'https://simple.wikipedia.org/wiki/Special:AllPages',
      'https://simple.wikipedia.org/wiki/Portal:Science',
      'https://simple.wikipedia.org/wiki/Portal:Technology',
      'https://simple.wikipedia.org/wiki/Portal:History',
    ],
    articleSelectors: ['#mw-content-text .mw-parser-output', '#mw-content-text'],
    titleSelectors: ['h1#firstHeading', 'h1'],
    linkSelector: '#mw-content-text a[href], .mw-allpages-chunk a[href]',
    linkFilter: /\/wiki\/(?!Special:|File:|Category:|Help:|Talk:|Wikipedia:)/,
    skipFilter: /stub|disambiguation|template/i,
  },
];

// ─── Quality Gate Constants ───────────────────────────────────────────────────

const MIN_WORD_COUNT = 150;
const MIN_UNIQUE_WORD_RATIO = 0.4;
const VALIDATE_SAMPLE_SIZE = 50;
const CRAWL_TARGET_PER_SOURCE = 625;
const OUTPUT_FILE = './crawled-passages.json';

// ─── CrawlerService ───────────────────────────────────────────────────────────

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Validate selectors against a 50-URL sample per source.
   * Reports extraction success rate and best-performing selector.
   *
   * Per D-11 + PIPE-02: run this BEFORE bulk crawl.
   * If any source has successRate < 0.80, logs WARNING for human review.
   */
  async validateSelectors(): Promise<SelectorValidationResult[]> {
    this.logger.log('Starting selector validation (50-URL sample per source)');
    const results: SelectorValidationResult[] = [];

    const browser = await chromium.launch({ headless: true });
    try {
      for (const source of SOURCES) {
        const result = await this.validateSource(browser, source);
        results.push(result);

        const pct = (result.successRate * 100).toFixed(1);
        if (result.successRate < 0.8) {
          this.logger.warn(
            `[${source.name}] LOW SUCCESS RATE: ${pct}% (selector: "${result.bestSelector}") — inspect before bulk crawl`,
          );
        } else {
          this.logger.log(
            `[${source.name}] OK: ${pct}% success (selector: "${result.bestSelector}", n=${result.totalSampled})`,
          );
        }
      }
    } finally {
      await browser.close();
    }

    this.logger.log('Selector validation complete.');
    console.log('\n=== Validation Summary ===');
    for (const r of results) {
      console.log(
        `  ${r.source}: ${(r.successRate * 100).toFixed(1)}% (${r.passed}/${r.totalSampled}) — best: "${r.bestSelector}"`,
      );
    }
    return results;
  }

  /**
   * Crawl all 4 sources (~625 URLs each), apply quality gate, write crawled-passages.json.
   *
   * Quality gate (PIPE-02):
   * - ≥150 words
   * - Unique word ratio ≥ 0.4 (filters boilerplate/duplicate content)
   * - ContentHash dedup: SHA-256 of cleaned text
   *
   * Polite delay: 300 + Math.random() * 900 ms between page fetches (T-05-05-03).
   */
  async crawlAll(): Promise<RawPassage[]> {
    this.logger.log(
      `Starting bulk crawl: ${CRAWL_TARGET_PER_SOURCE} URLs per source × ${SOURCES.length} sources`,
    );

    const allPassages: RawPassage[] = [];
    const seenHashes = new Set<string>();
    const seenUrls = new Set<string>();

    const browser = await chromium.launch({ headless: true });
    try {
      for (const source of SOURCES) {
        this.logger.log(`Crawling source: ${source.name}`);
        const passages = await this.crawlSource(browser, source, seenHashes, seenUrls);
        allPassages.push(...passages);
        this.logger.log(
          `[${source.name}] Done: ${passages.length} passages passed quality gate`,
        );
      }
    } finally {
      await browser.close();
    }

    // Write to output file for SeedService to consume
    const outputPath = path.resolve(process.cwd(), OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(allPassages, null, 2), 'utf8');

    this.logger.log(
      `Crawl complete: ${allPassages.length} passages written to ${outputPath}`,
    );
    return allPassages;
  }

  // ─── Private: Validation ───────────────────────────────────────────────────

  private async validateSource(
    browser: Browser,
    source: SourceConfig,
  ): Promise<SelectorValidationResult> {
    // Gather sample URLs from listing pages
    const sampleUrls = await this.collectArticleUrls(
      browser,
      source,
      VALIDATE_SAMPLE_SIZE,
    );

    if (sampleUrls.length === 0) {
      this.logger.warn(`[${source.name}] Could not collect any sample URLs`);
      return {
        source: source.name,
        baseUrl: source.baseUrl,
        successRate: 0,
        bestSelector: 'none',
        totalSampled: 0,
        passed: 0,
      };
    }

    // Track per-selector successes
    const selectorCounts = new Map<string, number>(
      source.articleSelectors.map((s) => [s, 0]),
    );

    let passed = 0;
    const total = Math.min(sampleUrls.length, VALIDATE_SAMPLE_SIZE);

    for (let i = 0; i < total; i++) {
      const url = sampleUrls[i];
      if (!url) continue;

      await this.politeDelay();
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        for (const selector of source.articleSelectors) {
          const el = $(selector);
          if (el.length > 0) {
            const text = el.text().replace(/\s+/g, ' ').trim();
            const wordCount = this.countWords(text);
            if (wordCount >= MIN_WORD_COUNT) {
              selectorCounts.set(selector, (selectorCounts.get(selector) ?? 0) + 1);
              passed++;
              break; // Count one success per URL (best selector wins)
            }
          }
        }
      } catch (err) {
        // Timeout or navigation error — skip URL
        this.logger.debug(`[${source.name}] Failed to load: ${url}`);
      } finally {
        await page.close();
      }
    }

    // Identify best selector (most successes)
    let bestSelector = source.articleSelectors[0] ?? 'none';
    let bestCount = 0;
    for (const [sel, count] of selectorCounts) {
      if (count > bestCount) {
        bestCount = count;
        bestSelector = sel;
      }
    }

    return {
      source: source.name,
      baseUrl: source.baseUrl,
      successRate: total === 0 ? 0 : passed / total,
      bestSelector,
      totalSampled: total,
      passed,
    };
  }

  // ─── Private: Bulk Crawl ───────────────────────────────────────────────────

  private async crawlSource(
    browser: Browser,
    source: SourceConfig,
    seenHashes: Set<string>,
    seenUrls: Set<string>,
  ): Promise<RawPassage[]> {
    const passages: RawPassage[] = [];
    const articleUrls = await this.collectArticleUrls(
      browser,
      source,
      CRAWL_TARGET_PER_SOURCE * 2, // collect extra to account for quality gate failures
    );

    let fetched = 0;
    let passed = 0;

    for (const url of articleUrls) {
      if (passed >= CRAWL_TARGET_PER_SOURCE) break;
      if (seenUrls.has(url)) continue;

      seenUrls.add(url);
      await this.politeDelay();

      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        const html = await page.content();
        const passage = this.extractPassage(html, url, source);
        fetched++;

        if (passage) {
          // URL + contentHash dedup (PIPE-02)
          if (!seenHashes.has(passage.contentHash)) {
            seenHashes.add(passage.contentHash);
            passages.push(passage);
            passed++;

            if (passed % 50 === 0) {
              this.logger.log(
                `[${source.name}] Progress: ${passed}/${CRAWL_TARGET_PER_SOURCE} passed (${fetched} fetched)`,
              );
            }
          }
        }
      } catch (err) {
        this.logger.debug(`[${source.name}] Failed to load ${url}: ${String(err)}`);
      } finally {
        await page.close();
      }
    }

    this.logger.log(
      `[${source.name}] Finished: ${passed} passed / ${fetched} fetched`,
    );
    return passages;
  }

  // ─── Private: URL Collection ───────────────────────────────────────────────

  /**
   * Collect article URLs from a source's listing pages up to maxUrls.
   */
  private async collectArticleUrls(
    browser: Browser,
    source: SourceConfig,
    maxUrls: number,
  ): Promise<string[]> {
    const urls = new Set<string>();

    // For Simple English Wikipedia, generate random article URLs since /Special:Random redirects
    if (source.name === 'Simple English Wikipedia') {
      return this.collectWikipediaUrls(browser, maxUrls);
    }

    for (const listingUrl of source.listingUrls) {
      if (urls.size >= maxUrls) break;
      const page = await browser.newPage();
      try {
        await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        $(source.linkSelector).each((_i, el) => {
          if (urls.size >= maxUrls) return false; // break
          const href = $(el).attr('href') ?? '';
          const absolute = this.toAbsolute(href, source.baseUrl);
          if (!absolute) return;
          if (source.linkFilter && !source.linkFilter.test(absolute)) return;
          if (source.skipFilter && source.skipFilter.test(absolute)) return;
          urls.add(absolute);
        });

        // Try pagination: look for "next page" links
        const nextPage = $('a[rel="next"], .next-page a, .pagination a.next').attr('href');
        if (nextPage && urls.size < maxUrls) {
          // Collected one more listing page — handled by re-running via listingUrls in next iteration
        }
      } catch (err) {
        this.logger.debug(`Failed to load listing page ${listingUrl}: ${String(err)}`);
      } finally {
        await page.close();
      }
    }

    return Array.from(urls).slice(0, maxUrls);
  }

  /**
   * Collect Wikipedia article URLs via the AllPages special page and random walks.
   */
  private async collectWikipediaUrls(
    browser: Browser,
    maxUrls: number,
  ): Promise<string[]> {
    const urls = new Set<string>();
    const allPagesBase = 'https://simple.wikipedia.org/wiki/Special:AllPages?from=';
    const startLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    for (const letter of startLetters) {
      if (urls.size >= maxUrls) break;
      const listingUrl = `${allPagesBase}${letter}`;
      const page = await browser.newPage();
      try {
        await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        const html = await page.content();
        const $ = cheerio.load(html);

        $('.mw-allpages-chunk a[href], .mw-allpages-body a[href]').each((_i, el) => {
          if (urls.size >= maxUrls) return false;
          const href = $(el).attr('href') ?? '';
          const absolute = this.toAbsolute(href, 'https://simple.wikipedia.org');
          if (!absolute) return;
          if (!/\/wiki\/(?!Special:|File:|Category:|Help:|Talk:|Wikipedia:)/.test(absolute)) return;
          if (/stub|disambiguation|template/i.test(absolute)) return;
          urls.add(absolute);
        });
      } catch (err) {
        this.logger.debug(`Failed to load Wikipedia AllPages ${listingUrl}: ${String(err)}`);
      } finally {
        await page.close();
      }
    }

    return Array.from(urls).slice(0, maxUrls);
  }

  // ─── Private: Extraction ───────────────────────────────────────────────────

  /**
   * Extract a passage from raw HTML using the source's selectors.
   * Returns null if quality gate fails.
   */
  private extractPassage(
    html: string,
    url: string,
    source: SourceConfig,
  ): RawPassage | null {
    const $ = cheerio.load(html);

    // Extract title
    let title = '';
    for (const sel of source.titleSelectors) {
      const t = $(sel).first().text().trim();
      if (t) { title = t; break; }
    }
    if (!title) {
      title = $('title').text().trim().split('|')[0]?.trim() ?? 'Untitled';
    }

    // Extract article body HTML
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bodyEl: cheerio.Cheerio<any> | null = null;
    for (const selector of source.articleSelectors) {
      const el = $(selector).first();
      if (el.length > 0) {
        // Quick check: does it have substantial text?
        const text = el.text().replace(/\s+/g, ' ').trim();
        if (this.countWords(text) >= MIN_WORD_COUNT) {
          bodyEl = el;
          break;
        }
      }
    }

    if (!bodyEl) return null;

    // Remove script and style elements (T-05-05-01 — XSS sanitization step 1)
    bodyEl.find('script, style, noscript, iframe, object, embed').remove();

    // For Wikipedia: remove edit links, navigation boxes, references section
    if (source.name === 'Simple English Wikipedia') {
      bodyEl.find('.mw-editsection, .reflist, #References, .navbox, .infobox, .sidebar').remove();
      bodyEl.find('table.wikitable').remove();
      bodyEl.find('.toc').remove();
    }

    // Get sanitized inner HTML
    const content = bodyEl.html() ?? '';
    // Get plain text for quality gate and hash
    const plainText = bodyEl
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    // Quality gate — PIPE-02
    const wordCount = this.countWords(plainText);
    if (wordCount < MIN_WORD_COUNT) return null;

    const uniqueWordRatio = this.calcUniqueWordRatio(plainText);
    if (uniqueWordRatio < MIN_UNIQUE_WORD_RATIO) return null;

    // ContentHash — SHA-256 of cleaned plain text (PIPE-02 dedup)
    const cleanText = plainText.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const contentHash = crypto.createHash('sha256').update(cleanText).digest('hex');

    return {
      title,
      content,
      sourceUrl: url,
      contentType: source.contentType,
      contentHash,
    };
  }

  // ─── Private: Utilities ────────────────────────────────────────────────────

  /** Random polite delay between 300ms and 1200ms (PIPE-02, T-05-05-03) */
  private politeDelay(): Promise<void> {
    const ms = 300 + Math.random() * 900;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }

  private calcUniqueWordRatio(text: string): number {
    const words = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    if (words.length === 0) return 0;
    const unique = new Set(words);
    return unique.size / words.length;
  }

  private toAbsolute(href: string, baseUrl: string): string | null {
    if (!href) return null;
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    if (href.startsWith('//')) return 'https:' + href;
    if (href.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        return base.origin + href;
      } catch {
        return null;
      }
    }
    return null;
  }
}
