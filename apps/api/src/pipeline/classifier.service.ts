/**
 * ClassifierService — CEFR passage classifier (PIPE-03, PIPE-04)
 *
 * Classifies a plain-text passage into B1, B2, or C1 using a weighted
 * rule-based approach:
 *   - Vocabulary difficulty:    50% (word match vs. cefr-word-list.json)
 *   - Sentence length:          25% (avg words/sentence; >25 = C1 signal)
 *   - Syntactic complexity:     25% (subordinate clause marker density)
 *
 * Proper nouns (NNP/NNPS POS tags) are excluded from vocabulary scoring.
 * Passages with cefrConfidence < 0.65 are flagged for manual review.
 *
 * cefr-word-list.json is loaded once at construction; never reloaded per call.
 */

import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import natural from 'natural';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassifyResult {
  cefrLevel: 'B1' | 'B2' | 'C1';
  cefrConfidence: number;
  flaggedForReview: boolean;
  isPublished: boolean;
}

// Internal band scoring (A1/A2 → B1, C2 → C1 normalization per spec)
type CefrBand = 'B1' | 'B2' | 'C1';

interface BandScore {
  B1: number;
  B2: number;
  C1: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 0.65;

// Subordinate clause / discourse complexity markers
const COMPLEXITY_MARKERS = new Set([
  'because',
  'although',
  'whereas',
  'however',
  'nevertheless',
  'consequently',
  'moreover',
  'furthermore',
  'despite',
  'notwithstanding',
  'therefore',
  'albeit',
  'nonetheless',
  'accordingly',
  'thereby',
  'wherefore',
  'insofar',
  'inasmuch',
  'henceforth',
  'thereupon',
  'whereby',
  'herein',
]);

// Minimum word count for reliable classification
const MIN_RELIABLE_WORDS = 30;

// ─── ClassifierService ───────────────────────────────────────────────────────

@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);

  /** Map<word, normalizedLevel> — loaded once at construction */
  private readonly wordMap: Map<string, CefrBand>;

  /** POS tagger — initialized once, reused per call */
  private readonly tagger: natural.BrillPOSTagger;

  /** WordTokenizer — stateless, safe to reuse */
  private readonly tokenizer: natural.WordTokenizer;

  constructor() {
    // Load the CEFR word list once at construction (not per classifyPassage call)
    this.wordMap = this.loadWordMap();

    // Initialize the POS tagger with English lexicon using language code 'EN'
    // (Lexicon constructor takes language code, not file path)
    const lexicon = new natural.Lexicon('EN', 'NN', 'NNP');
    const ruleSet = new natural.RuleSet('EN');
    this.tagger = new natural.BrillPOSTagger(lexicon, ruleSet);
    this.tokenizer = new natural.WordTokenizer();
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Classify a plain-text passage into a CEFR band (B1 | B2 | C1) with confidence.
   *
   * @param text Plain text passage (HTML must be stripped before calling).
   *             Threat T-05-04-01: classifyPassage receives stripped plain text.
   */
  async classifyPassage(text: string): Promise<ClassifyResult> {
    const tokens = this.tokenizer.tokenize(text.toLowerCase()) ?? [];
    const originalTokens = this.tokenizer.tokenize(text) ?? [];

    // Tag POS on original-case tokens to detect proper nouns (NNP/NNPS)
    const tagged = this.tagger.tag(originalTokens);
    const taggedWords = tagged.taggedWords;

    // Filter out proper nouns from vocabulary scoring
    const contentTokens = taggedWords
      .filter((tw) => tw.tag !== 'NNP' && tw.tag !== 'NNPS')
      .map((tw) => tw.token.toLowerCase());

    // ── 1. Vocabulary score (50%) ────────────────────────────────────────────
    const vocabScore = this.scoreVocabulary(contentTokens);

    // ── 2. Sentence length score (25%) ───────────────────────────────────────
    const sentLenScore = this.scoreSentenceLength(text);

    // ── 3. Syntactic complexity score (25%) ──────────────────────────────────
    const syntaxScore = this.scoreSyntacticComplexity(tokens);

    // ── Combine weighted scores ───────────────────────────────────────────────
    const bandScores: BandScore = {
      B1: vocabScore.B1 * 0.5 + sentLenScore.B1 * 0.25 + syntaxScore.B1 * 0.25,
      B2: vocabScore.B2 * 0.5 + sentLenScore.B2 * 0.25 + syntaxScore.B2 * 0.25,
      C1: vocabScore.C1 * 0.5 + sentLenScore.C1 * 0.25 + syntaxScore.C1 * 0.25,
    };

    const cefrLevel = this.pickLevel(bandScores);
    const rawConfidence = this.calcConfidence(bandScores);

    // Apply length penalty: very short texts are inherently unreliable
    const wordCount = tokens.length;
    const lengthFactor = Math.min(1.0, wordCount / MIN_RELIABLE_WORDS);
    const cefrConfidence = parseFloat((rawConfidence * lengthFactor).toFixed(4));

    const flaggedForReview = cefrConfidence < CONFIDENCE_THRESHOLD;
    const isPublished = !flaggedForReview;

    return { cefrLevel, cefrConfidence, flaggedForReview, isPublished };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Load cefr-word-list.json into a Map<word, normalizedLevel>.
   * Normalizes A1/A2 → B1, C2 → C1 per RESEARCH.md spec.
   * Path resolved from packages/database/prisma/seed-data/ relative to project root.
   */
  private loadWordMap(): Map<string, CefrBand> {
    // Resolve path: from apps/api/src/pipeline/ navigate 4 levels up to project root,
    // then into packages/database/prisma/seed-data/
    const filePath = path.resolve(
      __dirname,
      '../../../../packages/database/prisma/seed-data/cefr-word-list.json',
    );

    let raw: Array<{ word: string; level: string }>;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Array<{
        word: string;
        level: string;
      }>;
    } catch (err) {
      this.logger.warn(
        `cefr-word-list.json not found at ${filePath}. Using empty word map.`,
      );
      return new Map();
    }

    const map = new Map<string, CefrBand>();
    for (const entry of raw) {
      const normalized = this.normalizeLevel(entry.level);
      if (normalized) {
        map.set(entry.word.toLowerCase(), normalized);
      }
    }
    return map;
  }

  /**
   * Normalize raw CEFR level string to the three supported bands.
   * A1/A2 → B1 (simple vocabulary signal)
   * B1    → B1
   * B2    → B2
   * C1/C2 → C1 (advanced signal)
   */
  private normalizeLevel(level: string): CefrBand | null {
    switch (level.toUpperCase()) {
      case 'A1':
      case 'A2':
        return 'B1';
      case 'B1':
        return 'B1';
      case 'B2':
        return 'B2';
      case 'C1':
      case 'C2':
        return 'C1';
      default:
        return null;
    }
  }

  /**
   * Score vocabulary difficulty (50% weight).
   * Returns band scores that sum to 1.0.
   *
   * Unknown words: distributed 50% B2, 50% C1 (unknown words are likely advanced)
   */
  private scoreVocabulary(contentTokens: string[]): BandScore {
    if (contentTokens.length === 0) {
      return { B1: 1, B2: 0, C1: 0 };
    }

    let b1Count = 0;
    let b2Count = 0;
    let c1Count = 0;
    let unknownCount = 0;

    for (const token of contentTokens) {
      const level = this.wordMap.get(token);
      if (level === 'B1') b1Count++;
      else if (level === 'B2') b2Count++;
      else if (level === 'C1') c1Count++;
      else unknownCount++;
    }

    const total = contentTokens.length;

    // Unknown words: distribute proportionally (unknown academic/specialized
    // vocabulary tends to be higher level)
    const unknownShare = unknownCount / total;
    const b2FromUnknown = unknownShare * 0.5;
    const c1FromUnknown = unknownShare * 0.5;

    const b1Raw = b1Count / total;
    const b2Raw = b2Count / total + b2FromUnknown;
    const c1Raw = c1Count / total + c1FromUnknown;

    const sum = b1Raw + b2Raw + c1Raw;
    if (sum === 0) return { B1: 1, B2: 0, C1: 0 };

    return {
      B1: b1Raw / sum,
      B2: b2Raw / sum,
      C1: c1Raw / sum,
    };
  }

  /**
   * Score sentence length (25% weight).
   * >15 words/sentence avg = C1 indicator
   * 8–15 words/sentence avg = B2
   * <8 words/sentence avg = B1
   */
  private scoreSentenceLength(text: string): BandScore {
    const sentences = text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sentences.length === 0) return { B1: 1, B2: 0, C1: 0 };

    const avgWords =
      sentences.reduce((sum, s) => {
        const wordCount = s.split(/\s+/).filter((w) => w.length > 0).length;
        return sum + wordCount;
      }, 0) / sentences.length;

    if (avgWords > 15) {
      return { B1: 0, B2: 0.2, C1: 0.8 };
    } else if (avgWords > 8) {
      return { B1: 0.2, B2: 0.6, C1: 0.2 };
    } else {
      return { B1: 0.8, B2: 0.15, C1: 0.05 };
    }
  }

  /**
   * Score syntactic complexity (25% weight).
   * Count subordinate clause markers per 100 words.
   * >3 per 100 words = C1, 1–3 = B2, <1 = B1
   */
  private scoreSyntacticComplexity(tokens: string[]): BandScore {
    if (tokens.length === 0) return { B1: 1, B2: 0, C1: 0 };

    const markerCount = tokens.filter((t) => COMPLEXITY_MARKERS.has(t)).length;
    const per100 = (markerCount / tokens.length) * 100;

    if (per100 > 3) {
      return { B1: 0, B2: 0.2, C1: 0.8 };
    } else if (per100 >= 1) {
      return { B1: 0.2, B2: 0.6, C1: 0.2 };
    } else {
      return { B1: 0.8, B2: 0.15, C1: 0.05 };
    }
  }

  /**
   * Pick the CEFR band with the highest combined score.
   */
  private pickLevel(scores: BandScore): CefrBand {
    if (scores.C1 >= scores.B2 && scores.C1 >= scores.B1) return 'C1';
    if (scores.B2 >= scores.B1) return 'B2';
    return 'B1';
  }

  /**
   * Calculate confidence as how clearly one band dominates.
   * Confidence = top / (top + second) — ratio of dominant to nearest competitor.
   * Returns value in [0.0, 1.0].
   */
  private calcConfidence(scores: BandScore): number {
    const sorted = [scores.B1, scores.B2, scores.C1].sort((a, b) => b - a);
    const top = sorted[0] ?? 0;
    const second = sorted[1] ?? 0;

    if (top + second === 0) return 0;
    const confidence = top / (top + second);
    return Math.min(1.0, confidence);
  }
}
