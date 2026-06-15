/**
 * ListeningService — NestJS service for listening comprehension browsing + session management.
 *
 * LIST-01: getItems()     — paginated list filtered by cefrLevel / topic / contentType
 * LIST-01: getItemById()  — item detail with presigned audio URL and word timestamps
 * LIST-07: completeSession() — upserts ListeningProgress + creates XpEvent with skillArea LISTENING
 *
 * Security (T-06-02, T-06-03, T-06-04):
 *   - userId always from JWT payload, never request body
 *   - Server recomputes accuracy from attempts[] — client accuracy field is ignored
 *   - attempts.length validated against content._count.questions
 *   - Audio URLs presigned with 1-hour expiry (T-06-05)
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ListeningItemDto,
  ListeningItemDetailDto,
  ListeningQuestionDto,
  PaginatedListeningItemsDto,
  ListeningSessionCompleteDto,
  ListeningSessionResultDto,
  WordTimestamp,
} from '@repo/shared';

// ─── Filters type ─────────────────────────────────────────────────────────────

interface GetItemsFilters {
  cefrLevel?: string;
  topic?: string;
  contentType?: string;
  page?: number;
  limit?: number;
}

// ─── S3 client factory ────────────────────────────────────────────────────────

function createS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT ?? 'http://localhost:9000',
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretAccessKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    },
    forcePathStyle: true,
    region: 'us-east-1',
  });
}

const AUDIO_BUCKET = process.env.MINIO_BUCKET ?? 'english-learning';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ListeningService {
  private readonly s3: S3Client;

  constructor(private readonly prisma: PrismaService) {
    this.s3 = createS3Client();
  }

  /**
   * LIST-01 — GET /api/listening/items
   * Returns paginated listening content filtered by cefrLevel, topic, contentType.
   *
   * Security: isPublished: true filter always applied.
   */
  async getItems(
    _userId: string,
    filters: GetItemsFilters,
  ): Promise<PaginatedListeningItemsDto> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    // Build where clause — always include isPublished: true
    const where: Record<string, unknown> = { isPublished: true };
    if (filters.cefrLevel) where.cefrLevel = filters.cefrLevel;
    if (filters.topic) where.topic = filters.topic;
    if (filters.contentType) where.contentType = filters.contentType;

    const [items, total] = await Promise.all([
      this.prisma.listeningContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { questions: true } } },
      }),
      this.prisma.listeningContent.count({ where }),
    ]);

    const mappedItems: ListeningItemDto[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      contentType: item.contentType as ListeningItemDto['contentType'],
      cefrLevel: item.cefrLevel as ListeningItemDto['cefrLevel'],
      topic: item.topic ?? null,
      durationSec: item.durationSec ?? null,
      questionCount: item._count.questions,
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * LIST-01 — GET /api/listening/items/:id
   * Returns item detail with questions, progress for the user, and presigned audio URL.
   * Throws NotFoundException if the content does not exist.
   *
   * Security (T-06-05): audio URL has 1-hour expiry via getSignedUrl.
   */
  async getItemById(
    id: string,
    userId: string,
  ): Promise<ListeningItemDetailDto> {
    const item = await this.prisma.listeningContent.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        progress: { where: { userId }, take: 1 },
      },
    });

    if (!item) {
      throw new NotFoundException(`Listening content ${id} not found`);
    }

    // Generate presigned audio URL (T-06-05: 1-hour expiry)
    let audioUrl = '';
    if (item.audioStorageKey) {
      try {
        audioUrl = await getSignedUrl(
          this.s3,
          new GetObjectCommand({ Bucket: AUDIO_BUCKET, Key: item.audioStorageKey }),
          { expiresIn: 3600 },
        );
      } catch {
        audioUrl = '';
      }
    }

    const progressRow = (item.progress ?? [])[0] ?? null;

    return {
      id: item.id,
      title: item.title,
      contentType: item.contentType as ListeningItemDetailDto['contentType'],
      cefrLevel: item.cefrLevel as ListeningItemDetailDto['cefrLevel'],
      topic: item.topic ?? null,
      durationSec: item.durationSec ?? null,
      questionCount: item.questions.length,
      audioUrl,
      transcriptText: item.transcriptText,
      wordTimestamps: (item.wordTimestamps as WordTimestamp[] | null) ?? null,
      questions: item.questions.map((q) => ({
        id: q.id,
        exerciseType: q.exerciseType as ListeningQuestionDto['exerciseType'],
        prompt: q.prompt,
        answer: q.answer,
        distractors: q.distractors as string[],
        explanation: q.explanation ?? null,
        timestampSec: q.timestampSec ?? null,
        xpReward: q.xpReward,
        sortOrder: q.sortOrder,
      })),
      progress: progressRow
        ? {
            score: progressRow.score ?? 0,
            accuracy: progressRow.accuracy ?? 0,
          }
        : null,
    };
  }

  /**
   * LIST-07 — POST /api/listening/sessions/complete
   * Upserts ListeningProgress and creates XpEvent with skillArea LISTENING.
   *
   * Security (T-06-02): userId from JWT, never from request body.
   * Security (T-06-03): server recomputes accuracy — client accuracy field ignored.
   * Security (T-06-04): attempts.length validated against content._count.questions.
   */
  async completeSession(
    userId: string,
    dto: ListeningSessionCompleteDto,
  ): Promise<ListeningSessionResultDto> {
    // T-06-04: validate attempts count against question count for this content
    const content = await this.prisma.listeningContent.findUnique({
      where: { id: dto.contentId },
      select: { _count: { select: { questions: true } } },
    });

    if (content && dto.attempts.length > content._count.questions) {
      throw new BadRequestException(
        `attempts.length (${dto.attempts.length}) exceeds question count (${content._count.questions})`,
      );
    }

    // T-06-03: recompute accuracy server-side — ignore client-supplied accuracy
    const correct = dto.attempts.filter((a) => a.isCorrect).length;
    const total = dto.attempts.length;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    // Upsert ListeningProgress (compound key: userId_contentId)
    await this.prisma.listeningProgress.upsert({
      where: {
        userId_contentId: { userId, contentId: dto.contentId },
      },
      create: {
        userId,
        contentId: dto.contentId,
        score: dto.score,
        accuracy,
        completedAt: new Date(),
      },
      update: {
        score: dto.score,
        accuracy,
        completedAt: new Date(),
      },
    });

    // Create XpEvent with skillArea LISTENING
    const xpAmount = Math.round(dto.score * 10);
    await this.prisma.xpEvent.create({
      data: {
        userId,
        amount: xpAmount,
        reason: 'listening_session',
        skillArea: 'LISTENING',
        sourceRef: dto.contentId,
      },
    });

    return {
      score: dto.score,
      accuracy,
      xpEarned: xpAmount,
      contentId: dto.contentId,
    };
  }
}
