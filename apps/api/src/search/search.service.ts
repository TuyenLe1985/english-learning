// apps/api/src/search/search.service.ts
// SRCH-01, SRCH-02, SRCH-03, SRCH-04 — Global full-text search via PostgreSQL GIN indexes.
// GIN indexes created in Plan 08-01a; SearchModule registered in app.module.ts (08-01b).
// Quiz content excluded per locked D-11 (compound session content, not indexable).

import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@repo/database';
import { PrismaService } from '../prisma/prisma.service';
import type { SearchResultDto, SearchFilters } from './search.dto';

const CONTENT_TYPES = ['vocabulary', 'grammar', 'reading', 'listening'] as const;

// WR-04: Valid filter values — prevent enum crash and confusing empty results
const VALID_LEVELS = new Set(['B1', 'B2', 'C1']);
const VALID_SKILLS = new Set(['vocabulary', 'grammar', 'reading', 'listening']);

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, filters: SearchFilters): Promise<SearchResultDto[]> {
    const trimmed = q.trim();
    if (!trimmed) return [];

    // WR-04: Validate filter values before constructing SQL to prevent
    // PostgreSQL enum errors (invalid CefrLevel) and confusing empty results.
    if (filters.level && !VALID_LEVELS.has(filters.level)) {
      throw new BadRequestException(`Invalid level filter: ${filters.level}. Must be one of B1, B2, C1.`);
    }
    if (filters.skill && !VALID_SKILLS.has(filters.skill)) {
      throw new BadRequestException(`Invalid skill filter: ${filters.skill}. Must be one of vocabulary, grammar, reading, listening.`);
    }

    // Build per-branch SQL fragments. Skill filter limits to a single branch.
    const { level, topic, skill } = filters;
    const branches: Prisma.Sql[] = [];

    const includeVocab = !skill || skill === 'vocabulary';
    const includeGrammar = !skill || skill === 'grammar';
    const includeReading = !skill || skill === 'reading';
    const includeListening = !skill || skill === 'listening';

    if (includeVocab) {
      const extra: Prisma.Sql[] = [];
      if (level) extra.push(Prisma.sql`AND w."cefrLevel" = ${level}`);
      if (topic) extra.push(Prisma.sql`AND w.topic = ${topic}`);
      branches.push(Prisma.sql`
        SELECT
          w.id::text,
          'vocabulary'::text AS type,
          w.word AS title,
          ts_headline(
            'english',
            w.definition,
            plainto_tsquery('english', ${trimmed}),
            'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10'
          ) AS snippet,
          w."cefrLevel"::text,
          w.topic::text
        FROM "VocabularyWord" w
        WHERE to_tsvector('english', w.word || ' ' || w.definition) @@ plainto_tsquery('english', ${trimmed})
        ${extra.length ? Prisma.join(extra, ' ') : Prisma.empty}
      `);
    }

    if (includeGrammar) {
      const extra: Prisma.Sql[] = [];
      if (level) extra.push(Prisma.sql`AND gt."cefrLevel" = ${level}`);
      if (topic) extra.push(Prisma.sql`AND gt.name = ${topic}`);
      branches.push(Prisma.sql`
        SELECT
          gl.id::text,
          'grammar'::text AS type,
          gl.title AS title,
          ts_headline(
            'english',
            gl.explanation,
            plainto_tsquery('english', ${trimmed}),
            'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10'
          ) AS snippet,
          gt."cefrLevel"::text,
          gt.name::text AS topic
        FROM "GrammarLesson" gl
        JOIN "GrammarTopic" gt ON gl."topicId" = gt.id
        WHERE to_tsvector('english', gl.title || ' ' || gl.explanation) @@ plainto_tsquery('english', ${trimmed})
        ${extra.length ? Prisma.join(extra, ' ') : Prisma.empty}
      `);
    }

    if (includeReading) {
      const extra: Prisma.Sql[] = [];
      if (level) extra.push(Prisma.sql`AND rp."cefrLevel" = ${level}`);
      if (topic) extra.push(Prisma.sql`AND rp.topic = ${topic}`);
      branches.push(Prisma.sql`
        SELECT
          rp.id::text,
          'reading'::text AS type,
          rp.title AS title,
          ts_headline(
            'english',
            rp.content,
            plainto_tsquery('english', ${trimmed}),
            'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10'
          ) AS snippet,
          rp."cefrLevel"::text,
          rp.topic::text
        FROM "ReadingPassage" rp
        WHERE to_tsvector('english', rp.title || ' ' || rp.content) @@ plainto_tsquery('english', ${trimmed})
          AND rp."isPublished" = true
        ${extra.length ? Prisma.join(extra, ' ') : Prisma.empty}
      `);
    }

    if (includeListening) {
      const extra: Prisma.Sql[] = [];
      if (level) extra.push(Prisma.sql`AND lc."cefrLevel" = ${level}`);
      if (topic) extra.push(Prisma.sql`AND lc.topic = ${topic}`);
      branches.push(Prisma.sql`
        SELECT
          lc.id::text,
          'listening'::text AS type,
          lc.title AS title,
          ts_headline(
            'english',
            lc."transcriptText",
            plainto_tsquery('english', ${trimmed}),
            'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10'
          ) AS snippet,
          lc."cefrLevel"::text,
          lc.topic::text
        FROM "ListeningContent" lc
        WHERE to_tsvector('english', lc.title || ' ' || lc."transcriptText") @@ plainto_tsquery('english', ${trimmed})
          AND lc."isPublished" = true
        ${extra.length ? Prisma.join(extra, ' ') : Prisma.empty}
      `);
    }

    if (branches.length === 0) return [];

    const unionQuery = Prisma.sql`
      SELECT * FROM (
        ${Prisma.join(branches, ' UNION ALL ')}
      ) results
      LIMIT 100
    `;

    const rows = await this.prisma.$queryRaw<SearchResultDto[]>(unionQuery);
    return rows;
  }

  groupResults(query: string, rows: SearchResultDto[]) {
    const order = CONTENT_TYPES;
    const grouped = new Map<string, SearchResultDto[]>();
    for (const type of order) grouped.set(type, []);
    for (const row of rows) {
      grouped.get(row.type)?.push(row);
    }
    const groups = order
      .map((type) => ({ type, count: grouped.get(type)!.length, results: grouped.get(type)! }))
      .filter((g) => g.count > 0);
    return { query, total: rows.length, groups };
  }
}
