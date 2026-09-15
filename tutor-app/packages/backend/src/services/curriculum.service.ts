import type { PrismaClient } from "@prisma/client";

/** All curriculum content is read from the DB — never hard-coded here. */
export class CurriculumService {
  constructor(private readonly prisma: PrismaClient) {}

  async listSubjects() {
    return this.prisma.subject.findMany({ orderBy: { name: "asc" } });
  }

  async getSubjectTree(subjectId: string) {
    return this.prisma.subject.findUniqueOrThrow({
      where: { id: subjectId },
      include: {
        units: {
          orderBy: { order: "asc" },
          include: { concepts: { orderBy: { order: "asc" } } },
        },
      },
    });
  }

  async getConcept(conceptId: string) {
    return this.prisma.concept.findUniqueOrThrow({
      where: { id: conceptId },
      include: { unit: { include: { subject: true } } },
    });
  }

  async listConceptsForUnit(unitId: string) {
    return this.prisma.concept.findMany({
      where: { unitId },
      orderBy: { order: "asc" },
    });
  }
}
