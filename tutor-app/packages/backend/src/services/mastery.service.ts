import type { PrismaClient } from "@prisma/client";

const MASTERY_STEP_CORRECT = 0.2;
const MASTERY_STEP_INCORRECT = 0.1;

export class MasteryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getRecord(studentId: string, conceptId: string) {
    return this.prisma.masteryRecord.findUnique({
      where: { studentId_conceptId: { studentId, conceptId } },
    });
  }

  async listForStudent(studentId: string) {
    return this.prisma.masteryRecord.findMany({
      where: { studentId },
      include: { concept: true },
      orderBy: { lastAssessedAt: "desc" },
    });
  }

  /** Called by the tutoring state machine after each EVALUATE step. */
  async recordAttempt(studentId: string, conceptId: string, wasCorrect: boolean) {
    const existing = await this.getRecord(studentId, conceptId);
    const delta = wasCorrect ? MASTERY_STEP_CORRECT : -MASTERY_STEP_INCORRECT;
    const nextLevel = Math.min(1, Math.max(0, (existing?.level ?? 0) + delta));

    return this.prisma.masteryRecord.upsert({
      where: { studentId_conceptId: { studentId, conceptId } },
      update: {
        level: nextLevel,
        attempts: { increment: 1 },
        lastAssessedAt: new Date(),
      },
      create: {
        studentId,
        conceptId,
        level: Math.max(0, delta),
        attempts: 1,
      },
    });
  }

  /** Concepts below the mastery threshold — feeds "record weakness" and homework generation. */
  async listWeakConcepts(studentId: string, threshold = 0.5) {
    return this.prisma.masteryRecord.findMany({
      where: { studentId, level: { lt: threshold } },
      include: { concept: true },
      orderBy: { level: "asc" },
    });
  }
}
