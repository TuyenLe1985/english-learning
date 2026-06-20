// apps/api/src/search/search.dto.ts
// Local DTO — mirrors packages/shared/src/search.dto.ts for NestJS use.

export interface SearchResultDto {
  id: string;
  type: 'vocabulary' | 'grammar' | 'reading' | 'listening';
  title: string;
  snippet: string;
  cefrLevel: string | null;
  topic: string | null;
}

export interface SearchResultGroupDto {
  type: SearchResultDto['type'];
  count: number;
  results: SearchResultDto[];
}

export interface SearchResponseDto {
  query: string;
  total: number;
  groups: SearchResultGroupDto[];
}

export interface SearchFilters {
  level?: string;
  topic?: string;
  skill?: string;
}
