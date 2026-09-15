import type { PrismaClient } from "@prisma/client";
import { MasteryService } from "./mastery.service";

export class HomeworkService {
  private readonly masteryService: MasteryService;

  constructor(private readonly prisma: PrismaClient) {
    this.masteryService = new MasteryService(prisma);
  }

  async listForStudent(studentId: string) {
    return this.prisma.homeworkAssignment.findMany({
      where: { studentId },
      include: { items: { include: { concept: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Builds an assignment out of the student's current weak concepts. */
  async assignFromWeakConcepts(studentId: string, prompts: Record<string, string>, dueAt?: Date) {
    const weak = await this.masteryService.listWeakConcepts(studentId);
    if (weak.length === 0) {
      throw new Error("No weak concepts to assign homework for");
    }

    return this.prisma.homeworkAssignment.create({
      data: {
        studentId,
        dueAt,
        items: {
          create: weak.map((record) => ({
            conceptId: record.conceptId,
            prompt: prompts[record.conceptId] ?? `Practice: ${record.concept.title}`,
          })),
        },
      },
      include: { items: true },
    });
  }

  async submitAnswer(itemId: string, answer: string, isCorrect: boolean) {
    const item = await this.prisma.homeworkItem.update({
      where: { id: itemId },
      data: { submittedAnswer: answer, isCorrect, completedAt: new Date() },
      include: { assignment: true },
    });

    const remaining = await this.prisma.homeworkItem.count({
      where: { assignmentId: item.assignmentId, completedAt: null },
    });

    if (remaining === 0) {
      await this.prisma.homeworkAssignment.update({
        where: { id: item.assignmentId },
        data: { status: "COMPLETED" },
      });
    } else {
      await this.prisma.homeworkAssignment.update({
        where: { id: item.assignmentId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return item;
  }
}
