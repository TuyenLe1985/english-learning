import { Injectable } from '@nestjs/common';
import { CefrLevel } from '@repo/database';

type ClassifyResult = {
  cefrLevel: CefrLevel;
  cefrConfidence: number;
  flaggedForReview: boolean;
  isPublished: boolean;
};

// C1 indicator words — high Latinate/academic vocabulary
const C1_WORDS = new Set([
  'precipitate','reconceptualization','pedagogical','didactic','indispensable',
  'juxtaposition','algorithmic','humanistic','epistemic','pervasiveness',
  'paradigm','proliferation','discourse','interdisciplinary','hegemony',
  'commodification','delineate','promulgate','exacerbate','ameliorate',
  'propensity','ostensibly','ubiquitous','manifold','unprecedented',
  'contemporaneous','substantive','empirical','scrutiny','contingent',
  'ambiguous','conceptualization','multifaceted','implications','nuanced',
]);

// B2 indicator words — upper-intermediate vocabulary
const B2_WORDS = new Set([
  'accessible','sustainability','infrastructure','significantly','contributes',
  'preservation','environmental','increasingly','phenomenon','subsequently',
  'comprehensive','perspective','consequence','fundamental','considerable',
  'demonstrate','establish','evaluate','participate','emphasize',
  'particular','financial','commercial','political','appropriate',
  'indicate','consist','involve','achieve','require',
  'beneficial','controversial','traditional','contemporary','phenomenon',
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function avgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  if (!sentences.length) return 0;
  const total = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0);
  return total / sentences.length;
}

function subordinateClauseDensity(text: string): number {
  const words = tokenize(text);
  const markers = ['although','because','however','therefore','moreover','furthermore',
    'consequently','nevertheless','notwithstanding','whereas','whilst','whereby'];
  const count = words.filter(w => markers.includes(w)).length;
  return words.length > 0 ? count / words.length : 0;
}

@Injectable()
export class ClassifierService {
  async classifyPassage(text: string): Promise<ClassifyResult> {
    const words = tokenize(text);
    if (words.length < 10) {
      return { cefrLevel: 'B1', cefrConfidence: 0.4, flaggedForReview: true, isPublished: false };
    }

    const c1Count = words.filter(w => C1_WORDS.has(w)).length;
    const b2Count = words.filter(w => B2_WORDS.has(w)).length;
    const avgLen = avgSentenceLength(text);
    const clauseDensity = subordinateClauseDensity(text);

    // Score: 0–1 per dimension; weighted sum
    const vocabScore = Math.min(1, (c1Count * 2 + b2Count) / Math.max(1, words.length / 5));
    const sentLenScore = Math.min(1, avgLen / 30); // 30+ words/sentence → C1
    const clauseScore = Math.min(1, clauseDensity * 20);

    const c1Score = (vocabScore * 0.5 + sentLenScore * 0.25 + clauseScore * 0.25);

    let cefrLevel: CefrLevel;
    let cefrConfidence: number;

    if (c1Count >= 3 || c1Score >= 0.6) {
      cefrLevel = 'C1';
      cefrConfidence = Math.min(0.95, 0.55 + c1Score * 0.4);
    } else if (b2Count >= 4 || c1Score >= 0.3) {
      cefrLevel = 'B2';
      cefrConfidence = Math.min(0.90, 0.50 + (c1Score + vocabScore) * 0.2);
    } else {
      cefrLevel = 'B1';
      cefrConfidence = Math.min(0.85, 0.50 + (1 - c1Score) * 0.3);
    }

    const flaggedForReview = cefrConfidence < 0.65;
    return { cefrLevel, cefrConfidence, flaggedForReview, isPublished: !flaggedForReview };
  }
}
