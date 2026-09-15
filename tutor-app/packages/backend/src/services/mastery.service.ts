import type { PrismaClient } from "@prisma/client";

const MASTERY_STEP_CORRECT = 20;
const MASTERY_STEP_INCORRECT = 10;

export class MasteryService {
  constructor(private readonly prisma: PrismaClient) {}

  async getRecord(studentId: string, conceptId: string) {
    return this.prisma.studentConceptMastery.findUnique({
      where: { studentId_conceptId: { studentId, conceptId } },
    });
  }

  async listForStudent(studentId: string) {
    return this.prisma.studentConceptMastery.findMany({
      where: { studentId },
      include: { concept: true },
      orderBy: { updatedAt: "desc" },
    });
  }

  /** Called by the tutoring flow after each evaluated attempt. */
  async recordAttempt(studentId: string, conceptId: string, wasCorrect: boolean) {
    const existing = await this.getRecord(studentId, conceptId);
    const delta = wasCorrect ? MASTERY_STEP_CORRECT : -MASTERY_STEP_INCORRECT;
    const nextMastery = Math.min(100, Math.max(0, (existing?.currentMastery ?? 0) + delta));

    const record = await this.prisma.studentConceptMastery.upsert({
      where: { studentId_conceptId: { studentId, conceptId } },
      update: {
        attempts: { increment: 1 },
        correctCount: wasCorrect ? { increment: 1 } : undefined,
        incorrectCount: wasCorrect ? undefined : { increment: 1 },
        currentMastery: nextMastery,
        lastPracticedAt: new Date(),
      },
      create: {
        studentId,
        conceptId,
        attempts: 1,
        correctCount: wasCorrect ? 1 : 0,
        incorrectCount: wasCorrect ? 0 : 1,
        currentMastery: Math.max(0, delta),
        lastPracticedAt: new Date(),
      },
    });

    await this.prisma.masteryHistoryEntry.create({
      data: { masteryId: record.id, score: record.currentMastery },
    });

    return record;
  }

  /** Concepts below their own mastery threshold — feeds homework generation. */
  async listWeakConcepts(studentId: string) {
    const records = await this.prisma.studentConceptMastery.findMany({
      where: { studentId },
      include: { concept: true },
    });
    return records.filter((record) => record.currentMastery < record.concept.masteryThreshold);
  }
}
