import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ClassifierService } from './classifier.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as cheerio from 'cheerio';
import type { ContentType } from '@repo/database';

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface WhisperResponse {
  text?: string;
  words?: WhisperWord[];
}

@Injectable()
export class ListeningCrawlerService {
  private readonly s3: S3Client;
  private readonly whisperWorkerUrl: string;
  private readonly minioBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly classifierService: ClassifierService,
  ) {
    this.s3 = new S3Client({
      endpoint: config.get('MINIO_ENDPOINT', 'http://localhost:9000'),
      credentials: {
        accessKeyId: config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
        secretAccessKey: config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
      },
      forcePathStyle: true,
      region: 'us-east-1',
    });
    this.whisperWorkerUrl = config.get('WHISPER_WORKER_URL', 'http://localhost:9002');
    this.minioBucket = config.get('MINIO_BUCKET', 'english-learning');
  }

  async crawlItem(
    sourceUrl: string,
    contentType: ContentType,
    title: string,
    audioUrl: string,
    transcriptText: string,
  ): Promise<void> {
    try {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'listening-'));
      const tmpPath = path.join(tmpDir, `${randomUUID()}.mp3`);
      let mp3Buffer: Buffer;

      try {
        const res = await fetch(audioUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        mp3Buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(tmpPath, mp3Buffer);
      } catch (err) {
        console.warn(`[ListeningCrawler] Audio download failed for ${sourceUrl}:`, err);
        return;
      }

      const audioStorageKey = `audio/${contentType.toLowerCase()}/${randomUUID()}.mp3`;
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.minioBucket,
          Key: audioStorageKey,
          Body: mp3Buffer,
          ContentType: 'audio/mpeg',
        }),
      );

      const words = await this.callWhisperWorker(tmpPath);
      const wordTimestamps = words.length > 0 ? (words as unknown as import('@prisma/client').Prisma.JsonValue) : null;
      if (!wordTimestamps) console.warn(`[ListeningCrawler] No word timestamps for ${sourceUrl}`);

      const { cefrLevel, cefrConfidence, flaggedForReview } =
        await this.classifierService.classifyPassage(transcriptText);

      await this.prisma.listeningContent.upsert({
        where: { sourceUrl },
        create: {
          title,
          transcriptText,
          audioStorageKey,
          sourceUrl,
          contentType,
          cefrLevel,
          cefrConfidence,
          wordTimestamps,
          isPublished: !flaggedForReview,
          flaggedForReview,
        },
        update: { wordTimestamps, cefrLevel, cefrConfidence },
      });

      try {
        fs.unlinkSync(tmpPath);
        fs.rmdirSync(tmpDir);
      } catch {}
    } catch (err) {
      console.error(`[ListeningCrawler] Error processing ${sourceUrl}:`, err);
    }
  }

  async callWhisperWorker(audioPath: string): Promise<WhisperWord[]> {
    try {
      const formData = new FormData();
      const fileBlob = new Blob([fs.readFileSync(audioPath)], { type: 'audio/mpeg' });
      formData.append('file', fileBlob, path.basename(audioPath));
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');
      formData.append('language', 'en');

      const res = await fetch(`${this.whisperWorkerUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        console.warn(`[ListeningCrawler] Whisper worker returned ${res.status}`);
        return [];
      }

      const json = (await res.json()) as WhisperResponse;
      if (!json.words || json.words.length === 0) return [];
      return json.words;
    } catch (err) {
      console.warn('[ListeningCrawler] Whisper worker call failed:', err);
      return [];
    }
  }

  async crawlVoa(limit: number): Promise<void> {
    console.log(`[ListeningCrawler] Crawling VOA Learning English (limit=${limit})`);
    try {
      const listingUrl = 'https://learningenglish.voanews.com/z/4863';
      const res = await fetch(listingUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const $ = cheerio.load(html);

      const links: string[] = [];
      $('ul.items-list li a, .media-block__title a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !links.includes(href)) {
          links.push(href.startsWith('http') ? href : `https://learningenglish.voanews.com${href}`);
        }
      });

      for (const link of links.slice(0, limit)) {
        try {
          const itemRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const itemHtml = await itemRes.text();
          const $item = cheerio.load(itemHtml);
          const audioUrl = $item('audio source[type="audio/mpeg"]').attr('src') ?? '';
          if (!audioUrl) { console.warn(`[VOA] No audio at ${link}`); continue; }
          const title = $item('h1').first().text().trim() || 'VOA Learning English';
          const paragraphs: string[] = [];
          $item('.wsw p, .article-body p').each((_, p) => paragraphs.push($item(p).text().trim()));
          const transcriptText = paragraphs.filter(Boolean).join(' ');
          if (transcriptText.split(' ').length < 50) { console.warn(`[VOA] Short transcript at ${link}`); continue; }
          await this.crawlItem(link, 'NEWS_REPORT', title, audioUrl, transcriptText);
        } catch (err) {
          console.warn(`[VOA] Failed item ${link}:`, err);
        }
      }
    } catch (err) {
      console.error('[ListeningCrawler] VOA crawl failed:', err);
    }
  }

  async crawlBbc(limit: number): Promise<void> {
    console.log(`[ListeningCrawler] Crawling BBC Learning English (limit=${limit})`);
    try {
      const listingUrl = 'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english';
      const res = await fetch(listingUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const $ = cheerio.load(html);

      const links: string[] = [];
      $('.widget--promo a, .media-container a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !links.includes(href)) {
          links.push(href.startsWith('http') ? href : `https://www.bbc.co.uk${href}`);
        }
      });

      const contentTypes: ContentType[] = ['CONVERSATION', 'INTERVIEW'];
      for (let i = 0; i < Math.min(links.length, limit); i++) {
        const link = links[i]!;
        try {
          const itemRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const itemHtml = await itemRes.text();
          const $item = cheerio.load(itemHtml);
          const audioUrl =
            $item('.vxp-media__download a[href$=".mp3"]').attr('href') ??
            $item('a[href$=".mp3"]').first().attr('href') ??
            '';
          if (!audioUrl) { console.warn(`[BBC] No audio at ${link}`); continue; }
          const title = $item('h1').first().text().trim() || 'BBC 6 Minute English';
          const paragraphs: string[] = [];
          $item('.widget-richtext p, .body-copy p').each((_, p) =>
            paragraphs.push($item(p).text().trim()),
          );
          const transcriptText = paragraphs.filter(Boolean).join(' ');
          if (transcriptText.split(' ').length < 50) { console.warn(`[BBC] Short transcript at ${link}`); continue; }
          await this.crawlItem(link, contentTypes[i % 2]!, title, audioUrl, transcriptText);
        } catch (err) {
          console.warn(`[BBC] Failed item ${link}:`, err);
        }
      }
    } catch (err) {
      console.error('[ListeningCrawler] BBC crawl failed:', err);
    }
  }

  async crawlEslpod(limit: number): Promise<void> {
    console.log(`[ListeningCrawler] Crawling ESLPod via archive.org (limit=${limit})`);
    try {
      const searchUrl =
        'https://archive.org/advancedsearch.php?q=subject%3A%22eslpod%22&fl[]=identifier,title&rows=100&output=json';
      const res = await fetch(searchUrl);
      const json = (await res.json()) as {
        response?: { docs?: Array<{ identifier: string; title?: string }> };
      };
      const docs = json.response?.docs ?? [];

      for (const doc of docs.slice(0, limit)) {
        try {
          const filesRes = await fetch(`https://archive.org/metadata/${doc.identifier}/files`);
          const filesJson = (await filesRes.json()) as {
            result?: Array<{ name: string; format?: string }>;
          };
          const files = filesJson.result ?? [];
          const mp3File = files.find(f => f.name.endsWith('.mp3'));
          const txtFile = files.find(f => f.name.endsWith('.txt'));
          if (!mp3File) { console.warn(`[ESLPod] No MP3 for ${doc.identifier}`); continue; }
          const audioUrl = `https://archive.org/download/${doc.identifier}/${mp3File.name}`;
          let transcriptText = '';
          if (txtFile) {
            const txtRes = await fetch(
              `https://archive.org/download/${doc.identifier}/${txtFile.name}`,
            );
            transcriptText = await txtRes.text();
          }
          if (transcriptText.split(' ').length < 50) { console.warn(`[ESLPod] Short/no transcript for ${doc.identifier}`); continue; }
          const sourceUrl = `https://archive.org/details/${doc.identifier}`;
          await this.crawlItem(
            sourceUrl,
            'PODCAST',
            doc.title ?? `ESLPod ${doc.identifier}`,
            audioUrl,
            transcriptText,
          );
        } catch (err) {
          console.warn(`[ESLPod] Failed item ${doc.identifier}:`, err);
        }
      }
    } catch (err) {
      console.error('[ListeningCrawler] ESLPod crawl failed:', err);
    }
  }

  async crawlLecture(limit: number): Promise<void> {
    console.log(`[ListeningCrawler] Crawling TED Talks (limit=${limit})`);
    try {
      const listingUrl = 'https://www.ted.com/talks?language=en&sort=newest';
      const res = await fetch(listingUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      const $ = cheerio.load(html);

      const links: string[] = [];
      $('[data-testid="talk-card"] a, .media__message a').each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('/talks/') && !links.includes(href)) {
          links.push(href.startsWith('http') ? href : `https://www.ted.com${href}`);
        }
      });

      for (const link of links.slice(0, limit)) {
        try {
          const itemRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const itemHtml = await itemRes.text();
          const $item = cheerio.load(itemHtml);
          const sentences: string[] = [];
          $item(
            '.talk-transcript__sentence, [data-testid="transcript-sentence"]',
          ).each((_, el) => sentences.push($item(el).text().trim()));
          const transcriptText = sentences.join(' ');
          if (transcriptText.split(' ').length < 50) { console.warn(`[TED] Short/no transcript at ${link}`); continue; }
          const title = $item('h1').first().text().trim() || 'TED Talk';
          const { cefrLevel, cefrConfidence, flaggedForReview } =
            await this.classifierService.classifyPassage(transcriptText);
          await this.prisma.listeningContent.upsert({
            where: { sourceUrl: link },
            create: {
              title,
              transcriptText,
              audioStorageKey: '',
              sourceUrl: link,
              contentType: 'LECTURE',
              cefrLevel,
              cefrConfidence,
              wordTimestamps: null,
              isPublished: false,
              flaggedForReview: true,
            },
            update: { transcriptText, cefrLevel, cefrConfidence },
          });
        } catch (err) {
          console.warn(`[TED] Failed item ${link}:`, err);
        }
      }
    } catch (err) {
      console.error('[ListeningCrawler] TED crawl failed:', err);
    }
  }
}
