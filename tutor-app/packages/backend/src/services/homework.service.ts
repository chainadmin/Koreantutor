import type { PrismaClient } from "@prisma/client";
import { MasteryService } from "./mastery.service";

const DEFAULT_DUE_DAYS = 7;

export class HomeworkService {
  private readonly masteryService: MasteryService;

  constructor(private readonly prisma: PrismaClient) {
    this.masteryService = new MasteryService(prisma);
  }

  async listForStudent(studentId: string) {
    return this.prisma.homeworkAssignment.findMany({
      where: { studentId },
      include: { homeworkQuestions: { include: { question: { include: { choices: true } } } } },
      orderBy: { assignedDate: "desc" },
    });
  }

  /** Builds an assignment from one HOMEWORK-type question per weak concept. */
  async assignFromWeakConcepts(studentId: string, dueDate?: Date) {
    const weak = await this.masteryService.listWeakConcepts(studentId);
    if (weak.length === 0) {
      throw new Error("No weak concepts to assign homework for");
    }

    const questions = await Promise.all(
      weak.map((record) =>
        this.prisma.question.findFirst({
          where: { conceptId: record.conceptId, type: "HOMEWORK" },
        }),
      ),
    );
    const usableQuestions = questions.filter((question): question is NonNullable<typeof question> => question !== null);
    if (usableQuestions.length === 0) {
      throw new Error("No homework questions available for the student's weak concepts");
    }

    const resolvedDueDate = dueDate ?? new Date(Date.now() + DEFAULT_DUE_DAYS * 24 * 60 * 60 * 1000);

    return this.prisma.homeworkAssignment.create({
      data: {
        studentId,
        dueDate: resolvedDueDate,
        homeworkQuestions: {
          create: usableQuestions.map((question) => ({ questionId: question.id })),
        },
      },
      include: { homeworkQuestions: true },
    });
  }

  async submitAnswer(homeworkQuestionId: string, answerGiven: string, isCorrect: boolean) {
    const item = await this.prisma.homeworkQuestion.update({
      where: { id: homeworkQuestionId },
      data: { answerGiven, isCorrect, attempts: { increment: 1 } },
    });

    const [pending, total] = await Promise.all([
      this.prisma.homeworkQuestion.count({ where: { homeworkId: item.homeworkId, isCorrect: null } }),
      this.prisma.homeworkQuestion.count({ where: { homeworkId: item.homeworkId } }),
    ]);

    if (pending === 0) {
      const correct = await this.prisma.homeworkQuestion.count({
        where: { homeworkId: item.homeworkId, isCorrect: true },
      });
      await this.prisma.homeworkAssignment.update({
        where: { id: item.homeworkId },
        data: { completed: true, score: Math.round((correct / total) * 100) },
      });
    }

    return item;
  }
}
